use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct OnboardingSubmission {
    pub user_id: String,
    pub answers: serde_json::Value, // 13 answers as structured JSON
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InsightCard {
    pub title: String,
    pub description: String,
    pub priority: String, // "high" | "medium" | "low"
}

#[derive(Debug, Serialize)]
pub struct OnboardingResult {
    pub success: bool,
    pub health_score: i32,
    pub personality_badge: String,
    pub risk_category: String,
    pub savings_ratio: f32,
    pub ai_insights: Vec<InsightCard>,
    pub ai_reasoning: Option<String>, // CoT reasoning from DeepSeek
}

// ─── Routes ─────────────────────────────────────────────────────────────────

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/submit", post(submit_onboarding))
        .route("/profile/{user_id}", get(get_profile))
}

// ─── DeepSeek AI Prompt ─────────────────────────────────────────────────────

fn build_ai_prompt(answers_json: &str) -> String {
    format!(
        r#"Act as "ArthNiti" — a Strategic Financial Advisor specializing in the Indian context.

You are analyzing a user's financial profile. Use the 50-30-20 Rule as your scoring benchmark:
- 50% Needs (rent, groceries, utilities, EMIs)
- 30% Wants (entertainment, dining out, shopping)
- 20% Savings & Investments

IMPORTANT INDIAN FINANCIAL NUANCES:
1. EMI Culture: Most Indian Gen-Z/Millennials prioritize clearing debt (personal loans, credit card EMIs, education loans) over investing. Recognize this as financially prudent, not conservative.
2. Emergency Fund = Gold + Liquid Cash + Family Support: In India, emergency reserves often include physical gold, family lending networks, and FDs — not just savings accounts. Acknowledge these as valid.
3. Use ₹ (INR) for all monetary references. Understand typical Indian salary ranges (₹25K-₹2L/month for young professionals).
4. Consider recurring Indian expenses: rent, commute, mobile recharge, subscriptions, family contributions.

Based on this user profile:
{answers_json}

Calculate and return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):
{{
  "health_score": <0-100 integer based on 50-30-20 adherence>,
  "personality_badge": "<one of: 'The Prudent Guardian', 'The Steady Builder', 'The Balanced Navigator', 'The Growth Architect', 'The Bold Strategist'>",
  "risk_category": "<Conservative / Moderate / Aggressive>",
  "savings_ratio": <actual savings percentage as decimal, e.g. 0.15>,
  "insights": [
    {{
      "title": "<short actionable title>",
      "description": "<2-3 sentence personalized advice in Indian context using ₹>",
      "priority": "<high/medium/low>"
    }},
    {{
      "title": "<short actionable title>",
      "description": "<2-3 sentence personalized advice>",
      "priority": "<high/medium/low>"
    }},
    {{
      "title": "<short actionable title>",
      "description": "<2-3 sentence personalized advice>",
      "priority": "<high/medium/low>"
    }}
  ]
}}

Use Chain-of-Thought reasoning internally but only output the final JSON."#
    )
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async fn submit_onboarding(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<OnboardingSubmission>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = match Uuid::parse_str(&payload.user_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid user_id"
                })),
            );
        }
    };

    // 1. Store questionnaire answers in DB
    let answers_json = serde_json::to_string(&payload.answers).unwrap_or_default();

    let upsert_result = sqlx::query(
        r#"INSERT INTO user_profiles (user_id, questionnaire)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET questionnaire = $2, updated_at = NOW()"#,
    )
    .bind(user_id)
    .bind(&payload.answers)
    .execute(&state.db)
    .await;

    if let Err(e) = upsert_result {
        tracing::error!("❌ DB error storing questionnaire: {e}");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to store questionnaire"
            })),
        );
    }

    // 2. Call DeepSeek-R1 via Ollama for Strategic Synthesis
    let ai_prompt = build_ai_prompt(&answers_json);

    let ollama_req = serde_json::json!({
        "model": state.ollama_model,
        "messages": [
            {
                "role": "system",
                "content": "You are ArthNiti, an expert Indian financial strategist. You MUST respond with ONLY valid JSON, no markdown formatting, no code fences, no explanation text. Just the raw JSON object."
            },
            {
                "role": "user",
                "content": ai_prompt
            }
        ],
        "stream": false,
        "options": {
            "temperature": 0.3,
            "num_predict": 1024
        }
    });

    tracing::info!("🧠 Sending profile to DeepSeek-R1 for analysis (user={})", user_id);

    let ai_response = state
        .http_client
        .post(format!("{}/api/chat", state.ollama_base_url))
        .json(&ollama_req)
        .send()
        .await;

    let (health_score, personality_badge, risk_category, savings_ratio, insights, reasoning) =
        match ai_response {
            Ok(res) => {
                match res.json::<serde_json::Value>().await {
                    Ok(data) => {
                        let content = data["message"]["content"]
                            .as_str()
                            .unwrap_or("")
                            .to_string();

                        tracing::info!("🧠 DeepSeek raw response length: {} chars", content.len());

                        // Extract reasoning (between <think> tags if present)
                        let reasoning = if let (Some(start), Some(end)) =
                            (content.find("<think>"), content.find("</think>"))
                        {
                            Some(content[start + 7..end].trim().to_string())
                        } else {
                            None
                        };

                        // Extract JSON from response (strip <think> block and any markdown fences)
                        let json_str = content
                            .split("</think>")
                            .last()
                            .unwrap_or(&content)
                            .trim()
                            .trim_start_matches("```json")
                            .trim_start_matches("```")
                            .trim_end_matches("```")
                            .trim();

                        match serde_json::from_str::<serde_json::Value>(json_str) {
                            Ok(parsed) => {
                                let hs = parsed["health_score"].as_i64().unwrap_or(65) as i32;
                                let badge = parsed["personality_badge"]
                                    .as_str()
                                    .unwrap_or("The Balanced Navigator")
                                    .to_string();
                                let risk = parsed["risk_category"]
                                    .as_str()
                                    .unwrap_or("Moderate")
                                    .to_string();
                                let sr = parsed["savings_ratio"]
                                    .as_f64()
                                    .unwrap_or(0.15) as f32;
                                let ins: Vec<InsightCard> =
                                    serde_json::from_value(parsed["insights"].clone())
                                        .unwrap_or_else(|_| default_insights());

                                (hs, badge, risk, sr, ins, reasoning)
                            }
                            Err(e) => {
                                tracing::warn!("⚠️ Failed to parse AI JSON: {e}, using defaults");
                                fallback_analysis(&payload.answers)
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("⚠️ Ollama response parse error: {e}");
                        fallback_analysis(&payload.answers)
                    }
                }
            }
            Err(e) => {
                tracing::warn!("⚠️ Ollama unreachable: {e}, using fallback analysis");
                fallback_analysis(&payload.answers)
            }
        };

    // 3. Update profile with AI results
    let insights_json = serde_json::to_value(&insights).unwrap_or_default();

    let _ = sqlx::query(
        r#"UPDATE user_profiles
           SET health_score = $1, personality_badge = $2, ai_insights = $3,
               risk_category = $4, savings_ratio = $5, updated_at = NOW()
           WHERE user_id = $6"#,
    )
    .bind(health_score)
    .bind(&personality_badge)
    .bind(&insights_json)
    .bind(&risk_category)
    .bind(savings_ratio)
    .bind(user_id)
    .execute(&state.db)
    .await;

    // Also update users table health_score for quick access
    let _ = sqlx::query("UPDATE users SET health_score = $1 WHERE id = $2")
        .bind(health_score)
        .bind(user_id)
        .execute(&state.db)
        .await;

    tracing::info!(
        "✅ Profile analyzed: score={}, badge='{}', risk='{}'",
        health_score,
        personality_badge,
        risk_category
    );

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "health_score": health_score,
            "personality_badge": personality_badge,
            "risk_category": risk_category,
            "savings_ratio": savings_ratio,
            "ai_insights": insights,
            "ai_reasoning": reasoning,
        })),
    )
}

async fn get_profile(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let uid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "success": false, "message": "Invalid user_id" })),
            );
        }
    };

    let row = sqlx::query_as::<_, (
        Option<i32>,
        Option<String>,
        Option<serde_json::Value>,
        Option<String>,
        Option<f32>,
    )>(
        r#"SELECT health_score, personality_badge, ai_insights, risk_category, savings_ratio
           FROM user_profiles WHERE user_id = $1"#,
    )
    .bind(uid)
    .fetch_optional(&state.db)
    .await;

    match row {
        Ok(Some((hs, badge, insights, risk, sr))) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "health_score": hs.unwrap_or(0),
                "personality_badge": badge.unwrap_or_else(|| "Not Assessed".into()),
                "ai_insights": insights.unwrap_or(serde_json::json!([])),
                "risk_category": risk.unwrap_or_else(|| "Unknown".into()),
                "savings_ratio": sr.unwrap_or(0.0),
            })),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Profile not found. Complete onboarding first."
            })),
        ),
        Err(e) => {
            tracing::error!("DB error: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Database error"
                })),
            )
        }
    }
}

// ─── Fallback (when Ollama is unavailable) ──────────────────────────────────

fn fallback_analysis(
    answers: &serde_json::Value,
) -> (i32, String, String, f32, Vec<InsightCard>, Option<String>) {
    // Simple heuristic based on answers
    let income_idx = answers.get("q2").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let expense_idx = answers.get("q3").and_then(|v| v.as_i64()).unwrap_or(2) as i32;
    let savings_idx = answers.get("q4").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let debt_idx = answers.get("q5").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let emi_idx = answers.get("q6").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let emergency_idx = answers.get("q7").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let risk_idx = answers.get("q10").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let savings_pct = answers.get("q12").and_then(|v| v.as_f64()).unwrap_or(15.0) as f32;

    // Health score based on 50-30-20 adherence
    let savings_score = (savings_pct / 20.0 * 30.0).min(30.0) as i32;
    let debt_score = ((3 - debt_idx.min(3)) * 8 + (3 - emi_idx.min(3)) * 7).min(35);
    let emergency_score = (emergency_idx * 9).min(35);
    let health_score = (savings_score + debt_score + emergency_score).min(100).max(10);

    let risk_category = match risk_idx {
        0 => "Conservative",
        1 => "Moderate",
        2 => "Moderate",
        _ => "Aggressive",
    };

    let personality_badge = match health_score {
        0..=30 => "The Bold Strategist",
        31..=50 => "The Growth Architect",
        51..=70 => "The Balanced Navigator",
        71..=85 => "The Steady Builder",
        _ => "The Prudent Guardian",
    };

    let insights = default_insights();

    (
        health_score,
        personality_badge.into(),
        risk_category.into(),
        savings_pct / 100.0,
        insights,
        Some("Fallback analysis used (AI unavailable). Scores are approximate.".into()),
    )
}

fn default_insights() -> Vec<InsightCard> {
    vec![
        InsightCard {
            title: "Build Your Emergency Fund".into(),
            description: "Aim for 3-6 months of expenses in a liquid fund or FD. Gold holdings and family support also count towards your safety net.".into(),
            priority: "high".into(),
        },
        InsightCard {
            title: "Follow the 50-30-20 Rule".into(),
            description: "Allocate 50% of income to needs (rent, groceries, EMIs), 30% to wants, and 20% to savings/investments. Track with ArthNiti.".into(),
            priority: "medium".into(),
        },
        InsightCard {
            title: "Tackle High-Interest EMIs First".into(),
            description: "If you have credit card debt or personal loans above 15% interest, prioritize clearing these before investing. This is the smartest 'return' you can earn.".into(),
            priority: "high".into(),
        },
    ]
}
