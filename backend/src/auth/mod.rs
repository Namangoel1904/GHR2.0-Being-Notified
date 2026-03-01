use axum::{routing::post, Router};
use std::sync::Arc;

use crate::AppState;

mod handlers;
pub mod google;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register/start", post(handlers::start_registration))
        .route("/register/finish", post(handlers::finish_registration))
        .route("/login/start", post(handlers::start_authentication))
        .route("/login/finish", post(handlers::finish_authentication))
        .nest("/google", google::router())
}
