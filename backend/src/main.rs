use axum::{
    extract::State,
    http::{header, HeaderValue, Method},
    response::sse::{Event, Sse},
    routing::{get, post},
    Json, Router,
};
use dashmap::DashMap;
use futures::stream::Stream;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use std::{convert::Infallible, env, net::SocketAddr, sync::Arc, time::Duration};
use tokio_stream::StreamExt;
use tower_http::cors::{CorsLayer, AllowOrigin};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use webauthn_rs::prelude::*;
use webauthn_rs::Webauthn;

mod auth;
mod crypto;
mod db;
mod models;
mod routes;

// ─── Shared Application State ───────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub http_client: Client,
    pub ollama_base_url: String,
    pub ollama_model: String,
    pub encryption_key: Vec<u8>,
    // WebAuthn
    pub webauthn: Arc<Webauthn>,
    pub reg_challenges: Arc<DashMap<Uuid, PasskeyRegistration>>,
    pub auth_challenges: Arc<DashMap<String, PasskeyAuthentication>>,
}

// ─── Ollama Types ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaChatChunk {
    message: Option<OllamaChatChunkMessage>,
    done: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaChatChunkMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
}

// ─── Ollama Streaming Handler ───────────────────────────────────────────────

async fn chat_stream(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let ollama_url = format!("{}/api/chat", state.ollama_base_url);

    let request_body = OllamaChatRequest {
        model: state.ollama_model.clone(),
        messages: payload.messages,
        stream: true,
    };

    let response = state
        .http_client
        .post(&ollama_url)
        .json(&request_body)
        .send()
        .await;

    let stream = async_stream::stream! {
        match response {
            Ok(resp) => {
                let mut byte_stream = resp.bytes_stream();
                let mut buffer = String::new();

                while let Some(chunk_result) = byte_stream.next().await {
                    match chunk_result {
                        Ok(bytes) => {
                            buffer.push_str(&String::from_utf8_lossy(&bytes));

                            // Ollama sends newline-delimited JSON
                            while let Some(newline_pos) = buffer.find('\n') {
                                let line = buffer[..newline_pos].to_string();
                                buffer = buffer[newline_pos + 1..].to_string();

                                if line.trim().is_empty() {
                                    continue;
                                }

                                match serde_json::from_str::<OllamaChatChunk>(&line) {
                                    Ok(chunk) => {
                                        if let Some(msg) = &chunk.message {
                                            let event_data = serde_json::json!({
                                                "content": msg.content,
                                                "role": msg.role,
                                                "done": chunk.done,
                                            });
                                            yield Ok(Event::default()
                                                .data(event_data.to_string()));
                                        }
                                        if chunk.done {
                                            yield Ok(Event::default()
                                                .data(r#"{"content":"","done":true}"#.to_string()));
                                        }
                                    }
                                    Err(e) => {
                                        tracing::warn!("Failed to parse Ollama chunk: {e}");
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!("Stream error: {e}");
                            yield Ok(Event::default()
                                .data(format!(r#"{{"error":"Stream error: {e}"}}"#)));
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                tracing::error!("Ollama connection failed: {e}");
                yield Ok(Event::default()
                    .data(format!(r#"{{"error":"Failed to connect to Ollama: {e}"}}"#)));
            }
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

// ─── Health Check ───────────────────────────────────────────────────────────

async fn health_check(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    // Check DB connectivity
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();

    // Check Ollama connectivity
    let ollama_ok = state
        .http_client
        .get(format!("{}/api/tags", state.ollama_base_url))
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .is_ok();

    Json(serde_json::json!({
        "status": "ok",
        "services": {
            "database": if db_ok { "connected" } else { "disconnected" },
            "ollama": if ollama_ok { "connected" } else { "disconnected" },
        }
    }))
}

// ─── Main ───────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    // Load .env from project root (one level up from backend/)
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(".env");
    dotenvy::from_path(&env_path).ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ghr_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // ── Database ──
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    tracing::info!("✅ Connected to PostgreSQL");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("✅ Migrations applied");

    // ── Encryption key ──
    let aes_key_hex = env::var("AES_ENCRYPTION_KEY").expect("AES_ENCRYPTION_KEY must be set");
    let encryption_key =
        hex::decode(&aes_key_hex).expect("AES_ENCRYPTION_KEY must be valid hex (64 chars = 32 bytes)");
    assert_eq!(encryption_key.len(), 32, "AES key must be exactly 32 bytes");

    // ── WebAuthn ──
    let rp_id = env::var("RP_ID").unwrap_or_else(|_| "localhost".into());
    let rp_origin = env::var("RP_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".into());
    let rp_origin_url = url::Url::parse(&rp_origin).expect("RP_ORIGIN must be a valid URL");

    let webauthn = Arc::new(
        webauthn_rs::WebauthnBuilder::new(&rp_id, &rp_origin_url)
            .expect("Failed to build WebAuthn")
            .rp_name("FinAegis")
            .build()
            .expect("Failed to finalize WebAuthn"),
    );

    tracing::info!("✅ WebAuthn configured (rp_id={}, origin={})", rp_id, rp_origin);

    // ── Shared State ──
    let state = Arc::new(AppState {
        db: db_pool,
        http_client: Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap(),
        ollama_base_url: env::var("OLLAMA_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434".into()),
        ollama_model: env::var("OLLAMA_MODEL")
            .unwrap_or_else(|_| "deepseek-r1:8b".into()),
        encryption_key,
        webauthn,
        reg_challenges: Arc::new(DashMap::new()),
        auth_challenges: Arc::new(DashMap::new()),
    });

    // ── CORS ──
    let frontend_origin = env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:3000".into());

    // For hackathon demo: allow the frontend origin + any ngrok URL.
    // Note: allow_origin(Any) + allow_credentials(true) is FORBIDDEN by CORS spec
    // and will panic in tower-http. We use a list of allowed origins instead.
    let mut origins: Vec<HeaderValue> = vec![
        frontend_origin.parse().expect("Invalid FRONTEND_URL"),
    ];
    // If an ngrok URL is set, also allow it
    if let Ok(ngrok_url) = env::var("NGROK_URL") {
        if let Ok(val) = ngrok_url.parse::<HeaderValue>() {
            origins.push(val);
        }
    }

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::ACCEPT,
        ])
        .allow_credentials(true);

    // ── Routes ──
    let app = Router::new()
        // System
        .route("/api/health", get(health_check))
        // AI / Ollama
        .route("/api/ai/chat", post(chat_stream))
        // Auth (WebAuthn) — will be added in auth module
        .nest("/api/auth", auth::router())
        // Dashboard
        .nest("/api/dashboard", routes::dashboard::router())
        // Profile / Risk Quiz
        .nest("/api/profile", routes::profile::router())
        // Onboarding (Financial Niti questionnaire + AI synthesis)
        .nest("/api/onboarding", routes::onboarding::router())
        // Literacy
        .nest("/api/literacy", routes::literacy::router())
        .layer(cors)
        .with_state(state);

    // ── Start server ──
    let port: u16 = env::var("BACKEND_PORT")
        .unwrap_or_else(|_| "8080".into())
        .parse()
        .expect("Invalid BACKEND_PORT");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("🚀 GHR Backend listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
