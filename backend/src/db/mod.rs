// Database module — connection handling and migration runner
// The actual pool creation and migration is done in main.rs
// This module provides helper query functions

use sqlx::PgPool;

/// Verify database connectivity
pub async fn check_connection(pool: &PgPool) -> bool {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .is_ok()
}
