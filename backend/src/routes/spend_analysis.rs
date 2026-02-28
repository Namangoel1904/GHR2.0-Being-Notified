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
}

#[derive(serde::Serialize)]
pub struct SpendDataResponse {
    pub success: bool,
    pub total_spend: f64,
    pub recent_transactions: Vec<Transaction>,
    pub category_spending: std::collections::HashMap<String, f64>,
}

pub async fn get_spend_data(
    State(state): State<Arc<AppState>>,
    // TODO: Add auth extractor
) -> impl IntoResponse {
    let _user_id = Uuid::new_v4(); // TODO: get from auth state
    
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
