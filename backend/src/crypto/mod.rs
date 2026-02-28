use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;

/// Encrypt plaintext using AES-256-GCM.
/// Returns: base64(nonce || ciphertext)
pub fn encrypt(key: &[u8], plaintext: &str) -> Result<String, String> {
    if key.len() != 32 {
        return Err("AES key must be 32 bytes".into());
    }

    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    // Prepend nonce to ciphertext
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);

    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &combined,
    ))
}

/// Decrypt base64(nonce || ciphertext) back to plaintext.
pub fn decrypt(key: &[u8], encrypted_b64: &str) -> Result<String, String> {
    if key.len() != 32 {
        return Err("AES key must be 32 bytes".into());
    }

    let combined = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        encrypted_b64,
    )
    .map_err(|e| e.to_string())?;

    if combined.len() < 12 {
        return Err("Ciphertext too short".into());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = hex::decode("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2")
            .unwrap();
        let plaintext = "My salary is $5000 per month";

        let encrypted = encrypt(&key, plaintext).unwrap();
        assert_ne!(encrypted, plaintext);

        let decrypted = decrypt(&key, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
