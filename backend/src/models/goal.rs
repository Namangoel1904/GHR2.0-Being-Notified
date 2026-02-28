use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Goal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub deadline: Option<DateTime<Utc>>,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGoal {
    pub title: String,
    pub target_amount: f64,
    pub current_amount: Option<f64>,
    pub deadline: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGoal {
    pub title: Option<String>,
    pub target_amount: Option<f64>,
    pub current_amount: Option<f64>,
    pub deadline: Option<String>,
    pub category: Option<String>,
}
