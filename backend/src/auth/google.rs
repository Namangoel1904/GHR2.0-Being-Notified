use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Redirect,
    routing::{get, post},
    Json, Router,
};
use oauth2::{
    basic::BasicClient, reqwest::async_http_client, AuthUrl, AuthorizationCode, ClientId,
    ClientSecret, CsrfToken, RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc};
use uuid::Uuid;

use crate::{crypto, AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/url", get(get_auth_url))
        .route("/callback", get(google_callback))
        .route("/disconnect", post(google_disconnect))
}

#[derive(Deserialize)]
pub struct AuthUrlQuery {
    pub user_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct AuthUrlResponse {
    pub url: String,
}

fn create_oauth_client() -> BasicClient {
    let raw_client_id = env::var("GOOGLE_CLIENT_ID").unwrap_or_else(|_| "stub_client_id".into());
    
    // Create the debug log printing first 5 chars
    let display_id = if raw_client_id.len() > 5 {
        &raw_client_id[0..5]
    } else {
        &raw_client_id
    };
    tracing::info!("DEBUG: Attempting Google OAuth with Client ID: {}...", display_id);

    let client_id = ClientId::new(raw_client_id);
    let client_secret = ClientSecret::new(
        env::var("GOOGLE_CLIENT_SECRET").unwrap_or_else(|_| "stub_client_secret".into()),
    );
    let auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())
        .expect("Invalid Auth URL");
    let token_url = TokenUrl::new("https://oauth2.googleapis.com/token".to_string())
        .expect("Invalid Token URL");

    // Hardcode to match Google Cloud Console exactly
    let redirect_url = "http://localhost:8080/api/auth/google/callback".to_string();

    BasicClient::new(
        client_id,
        Some(client_secret),
        auth_url,
        Some(token_url),
    )
    .set_redirect_uri(RedirectUrl::new(redirect_url).expect("Invalid redirect URL"))
}

pub async fn get_auth_url(
    State(state): State<Arc<AppState>>,
    Query(query): Query<AuthUrlQuery>,
) -> Result<Json<AuthUrlResponse>, (StatusCode, String)> {
    let client = create_oauth_client();

    let state_str = if let Some(uid) = query.user_id {
        uid.to_string()
    } else {
        // Fallback: find existing mock user to prevent foreign key constraint violations in callback
        match sqlx::query!("SELECT id FROM users LIMIT 1").fetch_optional(&state.db).await {
            Ok(Some(row)) => row.id.to_string(),
            _ => {
                let uid = Uuid::new_v4();
                let _ = sqlx::query!("INSERT INTO users (id, username, display_name) VALUES ($1, $2, $3)", uid, format!("test_{}", uid), "Test User")
                    .execute(&state.db).await;
                uid.to_string()
            }
        }
    };

    let (auth_url, _csrf_token) = client
        .authorize_url(|| CsrfToken::new(state_str))
        .add_scope(Scope::new(
            "https://www.googleapis.com/auth/gmail.readonly".to_string(),
        ))
        // Request offline access to get a refresh token
        .add_extra_param("access_type", "offline")
        .add_extra_param("prompt", "consent")
        .url();

    Ok(Json(AuthUrlResponse {
        url: auth_url.to_string(),
    }))
}

#[derive(Deserialize)]
pub struct CallbackQuery {
    pub code: String,
    pub state: String,
}

pub async fn google_callback(
    State(state): State<Arc<AppState>>,
    Query(query): Query<CallbackQuery>,
) -> Result<Redirect, (StatusCode, String)> {
    let client = create_oauth_client();
    let code = AuthorizationCode::new(query.code);

    let token_res = client
        .exchange_code(code)
        .request_async(async_http_client)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("OAuth Error: {}", e)))?;

    if let Some(refresh_token) = token_res.refresh_token() {
        let rt_str = refresh_token.secret();
        
        // Encrypt the refresh token
        let encrypted_rt = crypto::encrypt(&state.encryption_key, rt_str)
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Encryption failed".into()))?;

        // Extract user_id from state
        if let Ok(user_uuid) = Uuid::parse_str(&query.state) {
            // Save to DB
            // Use UPSERT because the user_profile might not exist if they skipped onboarding
            let _ = sqlx::query!(
                r#"
                INSERT INTO user_profiles (user_id, questionnaire, google_refresh_token, updated_at)
                VALUES ($1, '{}'::jsonb, $2, NOW())
                ON CONFLICT (user_id) DO UPDATE 
                SET google_refresh_token = $2, updated_at = NOW()
                "#,
                user_uuid,
                encrypted_rt
            )
            .execute(&state.db)
            .await;
            tracing::info!("✅ Saved encrypted Google Refresh Token for {}", user_uuid);
        }
    }

    let frontend_url = env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".into());
    Ok(Redirect::to(&format!("{}/spend-analysis?google_sync=success", frontend_url)))
}

pub async fn google_disconnect(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let user_id_str = headers.get("x-user-id").and_then(|v| v.to_str().ok()).unwrap_or("");
    let user_id = match Uuid::parse_str(user_id_str) {
        Ok(uid) => uid,
        Err(_) => return Err((StatusCode::UNAUTHORIZED, "Unauthorized".to_string())),
    };

    let _ = sqlx::query!(
        r#"
        UPDATE user_profiles
        SET google_refresh_token = NULL, updated_at = NOW()
        WHERE user_id = $1
        "#,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB Error: {}", e)))?;

    tracing::info!("✅ Disconnected Google account for user {:?}", user_id);

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Gmail account disconnected successfully."
    })))
}
