use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::AppState;

// ─── Risk Quiz Types ────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct QuizSubmission {
    pub answers: Vec<QuizAnswer>,
}

#[derive(Debug, Deserialize)]
pub struct QuizAnswer {
    pub question_id: String,
    pub selected_option: i32, // 0-indexed option selection
}

#[derive(Debug, Serialize)]
pub struct QuizQuestion {
    pub id: String,
    pub question: String,
    pub options: Vec<String>,
    pub weight: i32,
}

#[derive(Debug, Serialize)]
pub struct RiskProfile {
    pub risk_score: i32,         // 0-100
    pub risk_category: String,   // Conservative, Moderate, Aggressive
    pub health_score: i32,       // 0-100
    pub breakdown: HealthBreakdown,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthBreakdown {
    pub savings_ratio: i32,
    pub debt_management: i32,
    pub emergency_fund: i32,
    pub investment_diversity: i32,
}

// ─── Route Setup ────────────────────────────────────────────────────────────

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/quiz-questions", get(get_quiz_questions))
        .route("/submit-quiz", post(submit_quiz))
        .route("/health-score", get(get_health_score))
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async fn get_quiz_questions() -> Json<Vec<QuizQuestion>> {
    Json(vec![
        QuizQuestion {
            id: "q1".into(),
            question: "What is your primary financial goal for the next 12 months?".into(),
            options: vec![
                "Build an emergency fund".into(),
                "Pay off existing debt".into(),
                "Start investing".into(),
                "Save for a major purchase".into(),
                "Grow existing investments aggressively".into(),
            ],
            weight: 20,
        },
        QuizQuestion {
            id: "q2".into(),
            question: "How would you react if your investment lost 20% in a month?".into(),
            options: vec![
                "Sell everything immediately".into(),
                "Sell some to reduce exposure".into(),
                "Hold and wait for recovery".into(),
                "Buy more at the lower price".into(),
            ],
            weight: 25,
        },
        QuizQuestion {
            id: "q3".into(),
            question: "How many months of expenses do you have saved?".into(),
            options: vec![
                "Less than 1 month".into(),
                "1-3 months".into(),
                "3-6 months".into(),
                "More than 6 months".into(),
            ],
            weight: 20,
        },
        QuizQuestion {
            id: "q4".into(),
            question: "What percentage of your income do you save monthly?".into(),
            options: vec![
                "0-5%".into(),
                "5-15%".into(),
                "15-30%".into(),
                "More than 30%".into(),
            ],
            weight: 20,
        },
        QuizQuestion {
            id: "q5".into(),
            question: "How comfortable are you with financial products (stocks, bonds, crypto)?".into(),
            options: vec![
                "Not comfortable at all".into(),
                "Basic understanding".into(),
                "Intermediate — I invest regularly".into(),
                "Expert — I actively manage a portfolio".into(),
            ],
            weight: 15,
        },
    ])
}

async fn submit_quiz(
    State(_state): State<Arc<AppState>>,
    Json(submission): Json<QuizSubmission>,
) -> Json<RiskProfile> {
    // Calculate risk score from answers
    let mut risk_score: i32 = 0;
    let mut health_indicators = [0i32; 4]; // savings, debt, emergency, diversity

    for answer in &submission.answers {
        let option_score = answer.selected_option as i32;
        match answer.question_id.as_str() {
            "q1" => {
                risk_score += option_score * 5;
                health_indicators[0] += option_score * 8;
            }
            "q2" => {
                risk_score += option_score * 8;
                health_indicators[3] += option_score * 10;
            }
            "q3" => {
                health_indicators[2] += option_score * 12;
                health_indicators[0] += option_score * 5;
            }
            "q4" => {
                health_indicators[0] += option_score * 12;
                health_indicators[1] += option_score * 5;
            }
            "q5" => {
                risk_score += option_score * 6;
                health_indicators[3] += option_score * 8;
            }
            _ => {}
        }
    }

    // Normalize scores to 0-100
    risk_score = (risk_score.min(100)).max(0);
    let health_score = health_indicators.iter().sum::<i32>().min(100).max(0);

    let risk_category = match risk_score {
        0..=33 => "Conservative",
        34..=66 => "Moderate",
        _ => "Aggressive",
    };

    let mut recommendations = vec![];
    if health_indicators[2] < 30 {
        recommendations.push("Build your emergency fund to cover 3-6 months of expenses".into());
    }
    if health_indicators[0] < 30 {
        recommendations.push("Aim to save at least 20% of your monthly income".into());
    }
    if health_indicators[1] < 20 {
        recommendations.push("Consider a debt consolidation strategy to reduce interest payments".into());
    }
    if health_indicators[3] < 25 {
        recommendations.push("Start with low-cost index funds to diversify your investments".into());
    }
    if recommendations.is_empty() {
        recommendations.push("Great financial health! Consider consulting an advisor for advanced strategies".into());
    }

    Json(RiskProfile {
        risk_score,
        risk_category: risk_category.into(),
        health_score,
        breakdown: HealthBreakdown {
            savings_ratio: health_indicators[0].min(100),
            debt_management: health_indicators[1].min(100),
            emergency_fund: health_indicators[2].min(100),
            investment_diversity: health_indicators[3].min(100),
        },
        recommendations,
    })
}

async fn get_health_score(
    State(_state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    // TODO: Fetch from user session
    Json(serde_json::json!({
        "health_score": 72,
        "last_updated": "2026-02-28T10:00:00Z",
        "trend": "improving"
    }))
}
