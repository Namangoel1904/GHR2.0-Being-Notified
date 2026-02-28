use axum::{extract::State, http::StatusCode, Json};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use webauthn_rs::prelude::*;

use crate::AppState;

// ─── Request / Response Types ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RegisterStartRequest {
    pub username: String,
    pub display_name: String,
}

/// Returned to the browser — contains the WebAuthn challenge options
#[derive(Debug, Serialize)]
pub struct RegisterStartResponse {
    pub success: bool,
    pub user_id: String,
    /// The PublicKeyCredentialCreationOptions — send this to startRegistration()
    pub options: serde_json::Value,
}

/// Browser sends back the credential from navigator.credentials.create()
#[derive(Debug, Deserialize)]
pub struct RegisterFinishRequest {
    pub user_id: String,
    pub credential: RegisterPublicKeyCredential,
}

#[derive(Debug, Deserialize)]
pub struct LoginStartRequest {
    pub username: String,
}

/// Returned to the browser — contains the WebAuthn assertion options  
#[derive(Debug, Serialize)]
pub struct LoginStartResponse {
    pub success: bool,
    /// The PublicKeyCredentialRequestOptions — send this to startAuthentication()
    pub options: serde_json::Value,
    pub username: String,
}

/// Browser sends back the signed assertion from navigator.credentials.get()
#[derive(Debug, Deserialize)]
pub struct LoginFinishRequest {
    pub username: String,
    pub credential: PublicKeyCredential,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async fn create_session(db: &sqlx::PgPool, user_id: Uuid) -> Result<String, sqlx::Error> {
    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(24);
    sqlx::query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)")
        .bind(user_id)
        .bind(&token)
        .bind(expires_at)
        .execute(db)
        .await?;
    Ok(token)
}

// ─── REGISTRATION: Step 1 ───────────────────────────────────────────────────

/// Generate a real WebAuthn registration challenge.
///
/// 1. UPSERT user in DB
/// 2. Call webauthn.start_passkey_registration() to get a cryptographic challenge
/// 3. Store the PasskeyRegistration state in DashMap (needed for step 2)
/// 4. Return CreationChallengeResponse as JSON for the browser
pub async fn start_registration(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterStartRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let username = payload.username.trim().to_string();
    let display_name = payload.display_name.trim().to_string();

    if username.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Username cannot be empty"
            })),
        );
    }

    let new_id = Uuid::new_v4();

    // UPSERT user
    let result = sqlx::query_as::<_, (Uuid,)>(
        r#"INSERT INTO users (id, username, display_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
           RETURNING id"#,
    )
    .bind(new_id)
    .bind(&username)
    .bind(&display_name)
    .fetch_one(&state.db)
    .await;

    let user_id = match result {
        Ok((id,)) => id,
        Err(e) => {
            tracing::error!("❌ DB error during registration: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Database error during registration"
                })),
            );
        }
    };

    // Load any existing credentials for this user (to exclude during re-registration)
    let existing_cred_ids: Vec<CredentialID> =
        match sqlx::query_as::<_, (Vec<u8>,)>(
            "SELECT credential_id FROM webauthn_credentials WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_all(&state.db)
        .await
        {
            Ok(rows) => rows.into_iter().map(|(id,)| id.into()).collect(),
            Err(_) => vec![],
        };

    let exclude = if existing_cred_ids.is_empty() {
        None
    } else {
        Some(existing_cred_ids)
    };

    // Generate WebAuthn challenge
    match state.webauthn.start_passkey_registration(
        user_id,
        &username,
        &display_name,
        exclude,
    ) {
        Ok((ccr, reg_state)) => {
            // Store challenge state server-side (REQUIRED for security)
            state.reg_challenges.insert(user_id, reg_state);

            tracing::info!("✅ Registration challenge created for user '{}' (id={})", username, user_id);

            let options = serde_json::to_value(&ccr).unwrap();

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "user_id": user_id.to_string(),
                    "options": options,
                })),
            )
        }
        Err(e) => {
            tracing::error!("❌ WebAuthn challenge generation failed: {e:?}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("WebAuthn error: {:?}", e)
                })),
            )
        }
    }
}

// ─── REGISTRATION: Step 2 ───────────────────────────────────────────────────

/// Verify the browser's credential and store the Passkey in PostgreSQL.
///
/// 1. Retrieve the PasskeyRegistration state from DashMap
/// 2. Call webauthn.finish_passkey_registration() to cryptographically verify
/// 3. Serialize the Passkey and store in webauthn_credentials table
/// 4. Create a session token
pub async fn finish_registration(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterFinishRequest>,
) -> (StatusCode, Json<AuthResponse>) {
    let user_id = match Uuid::parse_str(&payload.user_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(AuthResponse {
                    success: false,
                    message: "Invalid user_id".into(),
                    user_id: None,
                    token: None,
                }),
            );
        }
    };

    // Retrieve and remove the challenge state (one-time use)
    let reg_state = match state.reg_challenges.remove(&user_id) {
        Some((_, state)) => state,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(AuthResponse {
                    success: false,
                    message: "No pending registration challenge. Start registration first.".into(),
                    user_id: None,
                    token: None,
                }),
            );
        }
    };

    // Cryptographically verify the credential
    let passkey = match state
        .webauthn
        .finish_passkey_registration(&payload.credential, &reg_state)
    {
        Ok(pk) => pk,
        Err(e) => {
            tracing::error!("❌ Registration verification failed: {e:?}");
            return (
                StatusCode::BAD_REQUEST,
                Json(AuthResponse {
                    success: false,
                    message: format!("Passkey verification failed: {:?}", e),
                    user_id: None,
                    token: None,
                }),
            );
        }
    };

    // Serialize the Passkey for storage
    let passkey_json = serde_json::to_value(&passkey).unwrap();
    let cred_id_b64 = URL_SAFE_NO_PAD.encode(passkey.cred_id().as_ref());

    // Store credential in DB
    let store_result = sqlx::query(
        r#"INSERT INTO webauthn_credentials (user_id, credential_id, public_key, sign_count)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (credential_id) DO NOTHING"#,
    )
    .bind(user_id)
    .bind(&cred_id_b64)  // TEXT column — base64-encoded
    // Store the full serialized Passkey as BYTEA (we deserialize it for auth later)
    .bind(serde_json::to_vec(&passkey_json).unwrap())
    .bind(0_i64)
    .execute(&state.db)
    .await;

    match store_result {
        Ok(_) => {
            tracing::info!("✅ Passkey stored for user_id={}", user_id);

            match create_session(&state.db, user_id).await {
                Ok(token) => (
                    StatusCode::OK,
                    Json(AuthResponse {
                        success: true,
                        message: "Registration complete — passkey verified and stored".into(),
                        user_id: Some(user_id.to_string()),
                        token: Some(token),
                    }),
                ),
                Err(e) => {
                    tracing::error!("Session creation failed: {e}");
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(AuthResponse {
                            success: false,
                            message: "Passkey stored but session creation failed".into(),
                            user_id: Some(user_id.to_string()),
                            token: None,
                        }),
                    )
                }
            }
        }
        Err(e) => {
            tracing::error!("❌ Failed to store credential: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    message: "Failed to store credential in database".into(),
                    user_id: None,
                    token: None,
                }),
            )
        }
    }
}

// ─── LOGIN: Step 1 ──────────────────────────────────────────────────────────

/// Generate a real WebAuthn authentication challenge.
///
/// 1. Look up user by username
/// 2. Load their stored Passkey(s) from webauthn_credentials
/// 3. Call webauthn.start_passkey_authentication() to generate challenge
/// 4. Store PasskeyAuthentication state in DashMap
/// 5. Return RequestChallengeResponse as JSON for the browser
pub async fn start_authentication(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginStartRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let username = payload.username.trim().to_string();

    if username.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Username cannot be empty"
            })),
        );
    }

    // Look up user
    let user = sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM users WHERE username = $1",
    )
    .bind(&username)
    .fetch_optional(&state.db)
    .await;

    let user_id = match user {
        Ok(Some((id,))) => id,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("User '{}' not found. Register first.", username)
                })),
            );
        }
        Err(e) => {
            tracing::error!("DB error: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Database error"
                })),
            );
        }
    };

    // Load stored credentials (Passkeys)
    let cred_rows = sqlx::query_as::<_, (Vec<u8>,)>(
        "SELECT public_key FROM webauthn_credentials WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    if cred_rows.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": format!("No passkeys registered for '{}'. Register a passkey first.", username)
            })),
        );
    }

    // Deserialize stored Passkeys
    let passkeys: Vec<Passkey> = cred_rows
        .iter()
        .filter_map(|(pk_bytes,)| {
            let json_val: serde_json::Value = serde_json::from_slice(pk_bytes).ok()?;
            serde_json::from_value(json_val).ok()
        })
        .collect();

    if passkeys.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to deserialize stored credentials"
            })),
        );
    }

    // Generate WebAuthn authentication challenge
    match state.webauthn.start_passkey_authentication(&passkeys) {
        Ok((rcr, auth_state)) => {
            // Store challenge state keyed by username (needed for finish step)
            state.auth_challenges.insert(username.clone(), auth_state);

            let options = serde_json::to_value(&rcr).unwrap();

            tracing::info!("✅ Auth challenge created for '{}'", username);

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "options": options,
                    "username": username,
                })),
            )
        }
        Err(e) => {
            tracing::error!("❌ WebAuthn auth challenge failed: {e:?}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("WebAuthn error: {:?}", e)
                })),
            )
        }
    }
}

// ─── LOGIN: Step 2 ──────────────────────────────────────────────────────────

/// Verify the browser's signed assertion against the stored credential.
///
/// 1. Retrieve PasskeyAuthentication state from DashMap
/// 2. Call webauthn.finish_passkey_authentication() to cryptographically verify
/// 3. Update sign_count in DB (replay attack protection)  
/// 4. Create a session token
pub async fn finish_authentication(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginFinishRequest>,
) -> (StatusCode, Json<AuthResponse>) {
    let username = payload.username.trim().to_string();

    // Retrieve and remove challenge state (one-time use)
    let auth_state = match state.auth_challenges.remove(&username) {
        Some((_, state)) => state,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(AuthResponse {
                    success: false,
                    message: "No pending auth challenge. Start login first.".into(),
                    user_id: None,
                    token: None,
                }),
            );
        }
    };

    // Cryptographically verify the signature
    let auth_result = match state
        .webauthn
        .finish_passkey_authentication(&payload.credential, &auth_state)
    {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("❌ Auth verification failed for '{}': {e:?}", username);
            return (
                StatusCode::UNAUTHORIZED,
                Json(AuthResponse {
                    success: false,
                    message: format!("Authentication failed: {:?}", e),
                    user_id: None,
                    token: None,
                }),
            );
        }
    };

    tracing::info!(
        "✅ '{}' authenticated (counter={}, backup={})",
        username,
        auth_result.counter(),
        auth_result.backup_state()
    );

    // Look up user to get their UUID for session creation
    let user_id = match sqlx::query_as::<_, (Uuid,)>(
        "SELECT id FROM users WHERE username = $1",
    )
    .bind(&username)
    .fetch_one(&state.db)
    .await
    {
        Ok((id,)) => id,
        Err(e) => {
            tracing::error!("DB error fetching user: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    message: "User lookup failed after auth".into(),
                    user_id: None,
                    token: None,
                }),
            );
        }
    };

    // Create session
    match create_session(&state.db, user_id).await {
        Ok(token) => (
            StatusCode::OK,
            Json(AuthResponse {
                success: true,
                message: format!("Welcome back, {}! Passkey verified.", username),
                user_id: Some(user_id.to_string()),
                token: Some(token),
            }),
        ),
        Err(e) => {
            tracing::error!("Session error: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    message: "Auth succeeded but session creation failed".into(),
                    user_id: Some(user_id.to_string()),
                    token: None,
                }),
            )
        }
    }
}
