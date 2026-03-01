use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub amount_encrypted: String,         // AES-256-GCM encrypted
    pub description_encrypted: String,    // AES-256-GCM encrypted
    pub merchant_encrypted: String,       // AES-256-GCM encrypted via User Key
    pub category: String,
    pub transaction_date: DateTime<Utc>,
    pub is_flagged: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransaction {
    pub amount: f64,
    pub description: String,
    pub merchant: Option<String>,
    pub category: String,
    pub transaction_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id: Uuid,
    pub amount: f64,
    pub description: String,
    pub merchant: String,
    pub category: String,
    pub transaction_date: DateTime<Utc>,
    pub is_flagged: bool,
}
