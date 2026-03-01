use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use std::sync::Arc;
use uuid::Uuid;
use bytes::Bytes;

use crate::{
    db,
    models::transaction::Transaction,
    AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/upload", post(upload_statement))
        .route("/data", get(get_spend_data))
        .route("/manual", post(add_manual_transaction))
        .route("/gmail-sync", get(gmail_sync))
}

#[derive(serde::Serialize)]
pub struct SpendDataResponse {
    pub success: bool,
    pub total_spend: f64,
    pub recent_transactions: Vec<Transaction>,
    pub category_spending: std::collections::HashMap<String, f64>,
    pub has_gmail_connected: bool,
}

pub async fn get_spend_data(
    State(state): State<Arc<AppState>>,
    // TODO: Add auth extractor
) -> impl IntoResponse {
    // Check if the current user has a connected Gmail account
    let has_gmail_connected = sqlx::query!("SELECT google_refresh_token FROM user_profiles WHERE google_refresh_token IS NOT NULL LIMIT 1")
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None)
        .is_some();

    // Fetch all transactions for user
    let txs_db = match sqlx::query!(
        r#"
        SELECT id, user_id, amount_encrypted, description_encrypted, category, transaction_date, is_flagged, created_at
        FROM transactions
        ORDER BY transaction_date DESC
        "#
    )
    .fetch_all(&state.db)
    .await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to fetch transactions: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"success": false, "message": "Failed to fetch data"})),
            ).into_response();
        }
    };

    use crate::crypto;
    let mut total_spend = 0.0;
    let mut category_spending = std::collections::HashMap::new();
    let mut recent_transactions = Vec::new();

    for record in txs_db {
        let amount_str = match crypto::decrypt(&state.encryption_key, &record.amount_encrypted) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let desc_str = match crypto::decrypt(&state.encryption_key, &record.description_encrypted) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let amount: f64 = amount_str.parse().unwrap_or(0.0);
        
        // Sum negative amounts into spend 
        if amount < 0.0 {
            total_spend += amount.abs();
            *category_spending.entry(record.category.clone()).or_insert(0.0) += amount.abs();
        }

        recent_transactions.push(Transaction {
            id: record.id,
            user_id: record.user_id,
            amount_encrypted: amount_str, // Pass cleartext to frontend in this field for now
            description_encrypted: desc_str, // Pass cleartext to frontend
            category: record.category,
            transaction_date: record.transaction_date,
            is_flagged: record.is_flagged,
            created_at: record.created_at,
        });
    }

    (
        StatusCode::OK,
        Json(SpendDataResponse {
            success: true,
            total_spend,
            recent_transactions,
            category_spending,
            has_gmail_connected,
        })
    ).into_response()
}

#[derive(serde::Deserialize)]
pub struct ManualTransactionReq {
    pub amount: f64,
    pub description: String,
    pub category: String,
    pub payment_mode: String,
    pub date: String,
}

pub async fn add_manual_transaction(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ManualTransactionReq>,
) -> impl IntoResponse {
    use crate::crypto;

    // Safely extract the mock user ID to prevent PostgreSQL foreign key constraint violations
    let user_id = match sqlx::query!("SELECT id FROM users LIMIT 1").fetch_optional(&state.db).await {
        Ok(Some(r)) => r.id,
        _ => {
            let uid = Uuid::new_v4();
            let _ = sqlx::query!("INSERT INTO users (id, username, display_name) VALUES ($1, $2, $3)", uid, format!("test_{}", uid), "Test User").execute(&state.db).await;
            uid
        }
    };

    let formatted_desc = format!("[{}] {}", payload.payment_mode, payload.description);

    let amount_encrypted = match crypto::encrypt(&state.encryption_key, &payload.amount.to_string()) {
        Ok(enc) => enc,
        Err(e) => {
            tracing::error!("Failed to encrypt amount: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"success": false, "message": "Encryption error"}))).into_response();
        }
    };

    let desc_encrypted = match crypto::encrypt(&state.encryption_key, &formatted_desc) {
        Ok(enc) => enc,
        Err(e) => {
            tracing::error!("Failed to encrypt description: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"success": false, "message": "Encryption error"}))).into_response();
        }
    };

    let parsed_date = chrono::DateTime::parse_from_rfc3339(&format!("{}T00:00:00Z", payload.date))
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .unwrap_or_else(|_| chrono::Utc::now());

    let tx_id = Uuid::new_v4();

    let res = sqlx::query!(
        r#"
        INSERT INTO transactions (id, user_id, amount_encrypted, description_encrypted, category, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        tx_id,
        user_id,
        amount_encrypted,
        desc_encrypted,
        payload.category,
        parsed_date
    )
    .execute(&state.db)
    .await;

    match res {
        Ok(_) => {
            tracing::info!("✅ Manual transaction added successfully (id={})", tx_id);
            (
                StatusCode::OK,
                Json(serde_json::json!({"success": true, "message": "Manual transaction added"})),
            ).into_response()
        },
        Err(e) => {
            tracing::error!("❌ DB error inserting manual transaction: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"success": false, "message": "Database error"})),
            ).into_response()
        }
    }
}

pub async fn upload_statement(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut file_content: Option<Bytes> = None;
    let mut file_name: Option<String> = None;
    let mut content_type: Option<String> = None;

    // Iterate over the multipart stream
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "statement" {
            file_name = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            
            if let Ok(bytes) = field.bytes().await {
                file_content = Some(bytes);
            }
        }
    }

    let (content, f_name, c_type) = match (file_content, file_name, content_type) {
        (Some(c), Some(n), Some(t)) => (c, n, t),
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Missing file or file metadata"
                })),
            );
        }
    };

    tracing::info!("Received file: {} ({}), Size: {} bytes", f_name, c_type, content.len());

    // --- Step 1: Extract Text based on MIME type ---
    let mut raw_extracted_text = String::new();

    if c_type == "text/csv" || f_name.ends_with(".csv") {
        tracing::info!("Processing CSV...");
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(false)
            .from_reader(content.as_ref());
        for result in rdr.records() {
            if let Ok(record) = result {
                let row: Vec<&str> = record.iter().collect();
                raw_extracted_text.push_str(&row.join(", "));
                raw_extracted_text.push('\n');
            }
        }
    } else if c_type == "application/pdf" || f_name.ends_with(".pdf") {
        tracing::info!("Processing PDF...");
        match pdf_extract::extract_text_from_mem(&content) {
            Ok(text) => {
                raw_extracted_text = text;
            }
            Err(e) => {
                tracing::error!("Failed to extract PDF: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to extract text from PDF"
                    })),
                );
            }
        }
    } else if c_type.starts_with("image/") {
        tracing::info!("Processing Image OCR...");
        // Use free OCR.Space API (Option B) for image OCR
        use base64::{Engine as _, engine::general_purpose};
        let b64_image = general_purpose::STANDARD.encode(&content);
        let data_uri = format!("data:{};base64,{}", c_type, b64_image);

        let ocr_key = std::env::var("OCR_SPACE_API_KEY").unwrap_or_else(|_| "helloworld".into());
        let mut form = reqwest::multipart::Form::new()
            .text("apikey", ocr_key)
            .text("base64Image", data_uri)
            .text("language", "eng")
            .text("isTable", "true"); // Helps parsing bills

        let res: Result<reqwest::Response, reqwest::Error> = state.http_client.post("https://api.ocr.space/parse/image")
            .multipart(form)
            .send()
            .await;

        match res {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(results) = json["ParsedResults"].as_array() {
                        for page in results {
                            if let Some(text) = page["ParsedText"].as_str() {
                                raw_extracted_text.push_str(text);
                                raw_extracted_text.push('\n');
                            }
                        }
                    } else {
                        tracing::error!("OCR API didn't return ParsedResults: {:?}", json);
                    }
                }
            }
            Err(e) => {
                tracing::error!("OCR API request failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to connect to Image OCR service"
                    })),
                );
            }
        }
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Unsupported file format. Please upload CSV, PDF, or JPG/PNG."
            })),
        );
    }

    if raw_extracted_text.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "No text could be extracted from the uploaded document."
            })),
        );
    }

    // --- Step 2: Send extracted text to DeepSeek-R1 ---
    tracing::info!("🧠 Sending extracted text to DeepSeek-R1...");
    let system_prompt = r#"You are a precise financial data extraction AI.
You will receive raw, messy text scanned from a CSV, PDF, or Image bank statement.
Your ONLY job is to extract transactions into a STRICT, valid JSON array of objects.

Output format MUST be exactly this (no markdown, no extra text):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Short clean description (e.g., 'Amazon', 'Starbucks', 'Electricity Bill')",
    "amount": -50.25,
    "category": "Food & Dining"
  }
]

RULES:
- Use negative numbers for expenses/debits.
- Use positive numbers for income/credits.
- Guess the best category: "Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Health/Medical", "Income", "Others".
- Do NOT include balance forwards or running totals.
- KEEP YOUR `<think>` BLOCK UNDER 2 SENTENCES. THEN OUTPUT THE VALID JSON.
"#;

    // Use our Fast-Mode Ollama request shape
    let ollama_req = serde_json::json!({
        "model": state.ollama_model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": format!("Extract transactions from this text:\n\n{}", raw_extracted_text) }
        ],
        "stream": false,
        "options": {
            "temperature": 0.1,
            "num_predict": 4096,        // DeepSeek-R1 requires high token limits for its <think> blocks
        }
    });

    let ollama_url = format!("{}/api/chat", state.ollama_base_url);
    let mut ai_transactions_json = String::new();

    match state.http_client.post(&ollama_url).json(&ollama_req).send().await {
        Ok(resp) => {
            let status = resp.status();
            if let Ok(raw_text) = resp.text().await {
                tracing::info!("Ollama HTTP {}, response length: {} chars", status, raw_text.len());
                
                if !status.is_success() {
                    tracing::error!("Ollama returned error: {}", raw_text);
                } else {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw_text) {
                        let content = json["message"]["content"].as_str().unwrap_or("");
                        let thinking = json["message"]["thinking"].as_str().unwrap_or("");
                        let combined = format!("{}\n{}", thinking, content);

                        // Strip the <think>...</think> block using aggressive regex razor
                        let re = regex::Regex::new(r"(?s)<think>.*?</think>").unwrap();
                        let mut cleaned = re.replace_all(&combined, "").to_string();
                        
                        // Fallback if the AI forgot to close the think block
                        if let Some(start_think) = cleaned.find("<think>") {
                            if cleaned.find("</think>").is_none() {
                                // Cut from <think> to the end, hoping it's just truncation
                                cleaned.truncate(start_think); 
                            }
                        }

                        // Extract just the JSON array part
                        let json_re = regex::Regex::new(r"(?s)\[\s*\{.*?\}\s*\]").unwrap();
                        if let Some(caps) = json_re.captures(&cleaned) {
                            ai_transactions_json = caps[0].to_string();
                        } else if let Some(caps) = json_re.captures(&combined) {
                            // Fallback to combined if cleaned somehow ruined it
                            ai_transactions_json = caps[0].to_string();
                        }

                        if ai_transactions_json.is_empty() {
                            tracing::error!("Failed to extract JSON array. Raw JSON from Ollama: \n{}", raw_text);
                        }
                    } else {
                        tracing::error!("Failed to parse Ollama response as JSON: {}", raw_text);
                    }
                }
            }
        }
        Err(e) => {
            tracing::error!("Ollama offline or errored out: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "AI Parser offline. Please try again later."
                })),
            );
        }
    }

    if ai_transactions_json.is_empty() {
        tracing::error!("DeepSeek returned unparseable text");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "AI failed to find or parse transactions from the document."
            })),
        );
    }

    // Parse the JSON array into a vector of temporary structs
    #[derive(serde::Deserialize, core::fmt::Debug)]
    struct ParsedTx {
        date: String,
        description: String,
        amount: f64,
        category: String,
    }

    let parsed_txs: Vec<ParsedTx> = match serde_json::from_str(&ai_transactions_json) {
        Ok(txs) => txs,
        Err(e) => {
            tracing::error!("Failed to parse DeepSeek JSON string: {} | Content: {}", e, ai_transactions_json);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "AI returned invalid JSON format."
                })),
            );
        }
    };

    tracing::info!("✅ Successfully parsed {} transactions via DeepSeek!", parsed_txs.len());
    // --- Step 3: Encrypt & Store returned Transactions ---
    // Safely extract the mock user ID to prevent PostgreSQL foreign key constraint violations
    let user_id = match sqlx::query!("SELECT id FROM users LIMIT 1").fetch_optional(&state.db).await {
        Ok(Some(r)) => r.id,
        _ => {
            let uid = Uuid::new_v4();
            let _ = sqlx::query!("INSERT INTO users (id, username, display_name) VALUES ($1, $2, $3)", uid, format!("test_{}", uid), "Test User").execute(&state.db).await;
            uid
        }
    };
    let mut success_count = 0;

    for tx in parsed_txs {
        use crate::crypto;

        // Encrypt amount and description
        let amount_str = tx.amount.to_string();
        let amount_enc = match crypto::encrypt(&state.encryption_key, &amount_str) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let desc_enc = match crypto::encrypt(&state.encryption_key, &tx.description) {
            Ok(e) => e,
            Err(_) => continue,
        };

        // Parse date gracefully (fallback to Utc::now() on fail)
        let tx_date = chrono::NaiveDate::parse_from_str(&tx.date, "%Y-%m-%d")
            .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
            .unwrap_or_else(|_| chrono::Utc::now());

        let tx_id = Uuid::new_v4();
        
        // Insert into DB
        let insert_res = sqlx::query!(
            r#"
            INSERT INTO transactions (id, user_id, amount_encrypted, description_encrypted, category, transaction_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
            tx_id,
            user_id, // Hardcoded for now. Real app uses session user
            amount_enc,
            desc_enc,
            tx.category,
            tx_date
        )
        .execute(&state.db)
        .await;

        if insert_res.is_ok() {
            success_count += 1;
        }
    }

    tracing::info!("✅ Stored {} encrypted transactions in database", success_count);

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": format!("Successfully processed and encrypted {} transactions.", success_count),
        })),
    )
}

pub async fn gmail_sync(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    tracing::info!("Starting automated Gmail sync...");

    // 1. Fetch user with a google_refresh_token
    let profile = match sqlx::query!("SELECT user_id, google_refresh_token FROM user_profiles WHERE google_refresh_token IS NOT NULL LIMIT 1")
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "No connected Gmail account found."
                })),
            ).into_response();
        }
    };

    let rt_encrypted = profile.google_refresh_token.unwrap();
    let refresh_token = match crate::crypto::decrypt(&state.encryption_key, &rt_encrypted) {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to decrypt refresh token."
                })),
            ).into_response();
        }
    };

    // 2. Refresh Token -> Access Token via Google OAuth
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default();

    let client = reqwest::Client::new();
    let res = client.post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("refresh_token", refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send().await;

    let token_res: serde_json::Value = match res {
        Ok(r) => r.json().await.unwrap_or(serde_json::json!({})),
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Network error asking for google access token."
                })),
            ).into_response();
        }
    };

    let access_token = match token_res["access_token"].as_str() {
        Some(t) => t.to_string(),
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid refresh token. Please reconnect Gmail."
                })),
            ).into_response();
        }
    };

    // 3. Query Gmail API for statements/bills
    tracing::info!("Querying Gmail API for recent financial emails...");
    let query_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
    let list_res = client.get(query_url)
        .query(&[
            ("q", "bank OR statement OR bill OR invoice OR receipt OR order OR swiggy OR zomato OR amazon OR flipkart"),
            ("maxResults", "5"),
        ])
        .bearer_auth(&access_token)
        .send().await;

    let list_json: serde_json::Value = match list_res {
        Ok(r) => r.json().await.unwrap_or(serde_json::json!({})),
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to fetch email list from Gmail."
                })),
            ).into_response();
        }
    };

    let messages = list_json["messages"].as_array();
    if messages.is_none() || messages.unwrap().is_empty() {
        tracing::error!("Gmail API returned no messages or error. Raw JSON: {}", list_json.to_string());
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "No new financial emails found matching the criteria."
            })),
        ).into_response();
    }

    let messages = messages.unwrap();
    let mut all_raw_extracted_text = String::new();

    // 4. Extract text out of the API responses
    for msg in messages {
        if let Some(msg_id) = msg["id"].as_str() {
            tracing::info!("Fetching email details for ID: {}", msg_id);
            let detail_url = format!("https://gmail.googleapis.com/gmail/v1/users/me/messages/{}?format=full", msg_id);
            if let Ok(detail_resp) = client.get(&detail_url).bearer_auth(&access_token).send().await {
                if let Ok(detail_json) = detail_resp.json::<serde_json::Value>().await {
                    let mut text_found = false;

                    let decode_b64url = |data_str: &str| -> Option<String> {
                        use base64::Engine;
                        base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(data_str.trim().replace('-', "+").replace('_', "/")).ok()
                            .map(|b| String::from_utf8_lossy(&b).to_string())
                    };

                    if let Some(parts) = detail_json["payload"]["parts"].as_array() {
                        for part in parts {
                            if part["mimeType"] == "text/plain" {
                                if let Some(data) = part["body"]["data"].as_str() {
                                    if let Some(decoded) = decode_b64url(data) {
                                        all_raw_extracted_text.push_str(&decoded);
                                        all_raw_extracted_text.push('\n');
                                        text_found = true;
                                    }
                                }
                            }
                        }
                    } 
                    
                    if !text_found {
                        if let Some(body_data) = detail_json["payload"]["body"]["data"].as_str() {
                            if let Some(decoded) = decode_b64url(body_data) {
                                all_raw_extracted_text.push_str(&decoded);
                                all_raw_extracted_text.push('\n');
                            }
                        }
                    }
                }
            }
        }
    }

    if all_raw_extracted_text.trim().is_empty() {
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Emails found but couldn't extract readable text natively."
            })),
        ).into_response();
    }

    // 5. Send to DeepSeek-R1 (borrowing logic from upload_statement)
    tracing::info!("🧠 Sending extracted email text to DeepSeek-R1...");
    let system_prompt = r#"You are a precise financial data extraction AI.
You will receive raw, messy text retrieved from a user's recent bank or billing emails.
Your ONLY job is to extract transactions into a STRICT, valid JSON array of objects.

Output format MUST be exactly this (no markdown, no extra text):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Short clean description (e.g., 'Amazon', 'Electricity Bill')",
    "amount": -50.25,
    "category": "Food & Dining"
  }
]

RULES:
- Use negative numbers for expenses/debits.
- Use positive numbers for income/credits.
- Guess the best category: "Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Health/Medical", "Income", "Others".
- Do NOT include balance forwards or running totals.
- KEEP YOUR `<think>` BLOCK UNDER 2 SENTENCES. THEN OUTPUT THE VALID JSON.
"#;

    let ollama_req = serde_json::json!({
        "model": state.ollama_model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": format!("Extract transactions from this email text:\n\n{}", all_raw_extracted_text) }
        ],
        "stream": false,
        "options": {
            "temperature": 0.1,
            "num_predict": 4096,
        }
    });

    let ollama_url = format!("{}/api/chat", state.ollama_base_url);
    let mut ai_transactions_json = String::new();

    match state.http_client.post(&ollama_url).json(&ollama_req).send().await {
        Ok(resp) => {
            let status = resp.status();
            if let Ok(raw_text) = resp.text().await {
                if !status.is_success() {
                    tracing::error!("Ollama returned error: {}", raw_text);
                } else {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw_text) {
                        let content = json["message"]["content"].as_str().unwrap_or("");
                        let combined = format!("{}\n{}", json["message"]["thinking"].as_str().unwrap_or(""), content);

                        let re = regex::Regex::new(r"(?s)<think>.*?</think>").unwrap();
                        let mut cleaned = re.replace_all(&combined, "").to_string();
                        
                        if let Some(start_think) = cleaned.find("<think>") {
                            if cleaned.find("</think>").is_none() {
                                cleaned.truncate(start_think); 
                            }
                        }

                        let json_re = regex::Regex::new(r"(?s)\[\s*\{.*?\}\s*\]").unwrap();
                        if let Some(caps) = json_re.captures(&cleaned) {
                            ai_transactions_json = caps[0].to_string();
                        } else if let Some(caps) = json_re.captures(&combined) {
                            ai_transactions_json = caps[0].to_string();
                        }
                    }
                }
            }
        }
        Err(e) => {
            tracing::error!("Ollama offline or errored out: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "AI Parser offline. Please try again later."
                })),
            ).into_response();
        }
    }

    if ai_transactions_json.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "AI failed to find or parse transactions from the emails."
            })),
        ).into_response();
    }

    #[derive(serde::Deserialize, core::fmt::Debug)]
    struct ParsedTx {
        date: String,
        description: String,
        amount: f64,
        category: String,
    }

    let parsed_txs: Vec<ParsedTx> = match serde_json::from_str(&ai_transactions_json) {
        Ok(txs) => txs,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "AI returned invalid JSON format."
                })),
            ).into_response();
        }
    };

    let user_id = profile.user_id;
    let mut success_count = 0;

    for tx in parsed_txs {
        use crate::crypto;

        let amount_str = tx.amount.to_string();
        let amount_enc = match crypto::encrypt(&state.encryption_key, &amount_str) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let desc_enc = match crypto::encrypt(&state.encryption_key, &tx.description) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let tx_date = chrono::NaiveDate::parse_from_str(&tx.date, "%Y-%m-%d")
            .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
            .unwrap_or_else(|_| chrono::Utc::now());

        let tx_id = Uuid::new_v4();
        
        let insert_res = sqlx::query!(
            r#"
            INSERT INTO transactions (id, user_id, amount_encrypted, description_encrypted, category, transaction_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
            tx_id,
            user_id,
            amount_enc,
            desc_enc,
            tx.category,
            tx_date
        )
        .execute(&state.db)
        .await;

        if insert_res.is_ok() {
            success_count += 1;
        }
    }

    tracing::info!("✅ Gmail Sync: Stored {} encrypted transactions", success_count);

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": format!("Gmail Sync Complete: the AI extracted {} transactions from recent emails.", success_count),
        })),
    ).into_response()
}
