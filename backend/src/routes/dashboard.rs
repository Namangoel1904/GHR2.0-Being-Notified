use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::transaction::CreateTransaction;
use crate::models::goal::{CreateGoal, Goal};
use crate::AppState;

// ─── Spending Analysis Response ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SpendingCategory {
    pub category: String,
    pub total: f64,
    pub percentage: f64,
    pub transaction_count: i64,
}

#[derive(Debug, Serialize)]
pub struct SpendingAnalysis {
    pub total_spending: f64,
    pub categories: Vec<SpendingCategory>,
    pub month: String,
}

#[derive(Debug, Serialize)]
pub struct Alert {
    pub id: String,
    pub alert_type: String,
    pub message: String,
    pub severity: String, // "low" | "medium" | "high"
    pub timestamp: String,
}

// ─── Route Setup ────────────────────────────────────────────────────────────

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // Transactions
        .route("/transactions", get(list_transactions).post(add_transaction))
        // Spending Analysis
        .route("/spending-analysis", get(spending_analysis))
        // Alerts
        .route("/alerts", get(get_alerts))
        // Goals
        .route("/goals", get(list_goals).post(create_goal))
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async fn list_transactions(
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    // TODO: Get user_id from session, decrypt transactions
    Json(serde_json::json!({
        "transactions": [],
        "message": "Transactions endpoint ready"
    }))
}

async fn add_transaction(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateTransaction>,
) -> Json<serde_json::Value> {
    let id = Uuid::new_v4();

    // Encrypt sensitive fields before storage
    let amount_enc = crate::crypto::encrypt(
        &state.encryption_key,
        &payload.amount.to_string(),
    );
    let desc_enc = crate::crypto::encrypt(
        &state.encryption_key,
        &payload.description,
    );

    match (amount_enc, desc_enc) {
        (Ok(amount_encrypted), Ok(description_encrypted)) => {
            let result = sqlx::query(
                r#"INSERT INTO transactions (id, user_id, amount_encrypted, description_encrypted, category)
                   VALUES ($1, $2, $3, $4, $5)"#,
            )
            .bind(id)
            .bind(Uuid::new_v4()) // TODO: real user_id from session
            .bind(&amount_encrypted)
            .bind(&description_encrypted)
            .bind(&payload.category)
            .execute(&state.db)
            .await;

            match result {
                Ok(_) => Json(serde_json::json!({
                    "success": true,
                    "id": id.to_string(),
                    "message": "Transaction added (encrypted)"
                })),
                Err(e) => Json(serde_json::json!({
                    "success": false,
                    "error": format!("DB error: {e}")
                })),
            }
        }
        _ => Json(serde_json::json!({
            "success": false,
            "error": "Encryption failed"
        })),
    }
}

async fn spending_analysis(
    State(_state): State<Arc<AppState>>,
) -> Json<SpendingAnalysis> {
    // Demo: return sample spending analysis
    Json(SpendingAnalysis {
        total_spending: 3450.00,
        categories: vec![
            SpendingCategory {
                category: "Housing".into(),
                total: 1200.00,
                percentage: 34.8,
                transaction_count: 1,
            },
            SpendingCategory {
                category: "Food & Dining".into(),
                total: 650.00,
                percentage: 18.8,
                transaction_count: 24,
            },
            SpendingCategory {
                category: "Transportation".into(),
                total: 450.00,
                percentage: 13.0,
                transaction_count: 15,
            },
            SpendingCategory {
                category: "Entertainment".into(),
                total: 380.00,
                percentage: 11.0,
                transaction_count: 8,
            },
            SpendingCategory {
                category: "Utilities".into(),
                total: 320.00,
                percentage: 9.3,
                transaction_count: 5,
            },
            SpendingCategory {
                category: "Shopping".into(),
                total: 450.00,
                percentage: 13.1,
                transaction_count: 12,
            },
        ],
        month: "2026-02".into(),
    })
}

async fn get_alerts(
    State(_state): State<Arc<AppState>>,
) -> Json<Vec<Alert>> {
    // Demo: return sample alerts
    Json(vec![
        Alert {
            id: "alert-001".into(),
            alert_type: "unusual_spending".into(),
            message: "Your entertainment spending is 45% higher than last month".into(),
            severity: "medium".into(),
            timestamp: "2026-02-27T10:30:00Z".into(),
        },
        Alert {
            id: "alert-002".into(),
            alert_type: "goal_milestone".into(),
            message: "You're 80% towards your Emergency Fund goal!".into(),
            severity: "low".into(),
            timestamp: "2026-02-26T14:00:00Z".into(),
        },
    ])
}

async fn list_goals(
    State(_state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "goals": [],
        "message": "Goals endpoint ready"
    }))
}

async fn create_goal(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateGoal>,
) -> Json<serde_json::Value> {
    let id = Uuid::new_v4();

    let result = sqlx::query(
        r#"INSERT INTO goals (id, user_id, title, target_amount, current_amount, category)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(id)
    .bind(Uuid::new_v4()) // TODO: real user_id from session
    .bind(&payload.title)
    .bind(payload.target_amount)
    .bind(payload.current_amount.unwrap_or(0.0))
    .bind(payload.category.as_deref().unwrap_or("General"))
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "id": id.to_string(),
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "error": format!("DB error: {e}")
        })),
    }
}
