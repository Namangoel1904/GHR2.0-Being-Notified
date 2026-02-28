import {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn,
    platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import { API_BASE } from "./utils";

export { browserSupportsWebAuthn, platformAuthenticatorIsAvailable };

export interface AuthResult {
    success: boolean;
    message: string;
    user_id?: string;
    token?: string;
}

/**
 * Real FIDO2 WebAuthn Registration Flow:
 *
 * 1. POST /register/start  → server returns CreationChallengeResponse (PublicKeyCredentialCreationOptions)
 * 2. startRegistration()   → browser triggers native passkey/biometric/hybrid prompt
 * 3. POST /register/finish → server verifies attestation, stores credential in DB
 */
export async function registerPasskey(
    username: string,
    displayName: string
): Promise<AuthResult> {
    // Step 1: Get cryptographic challenge from server
    const startRes = await fetch(`${API_BASE}/api/auth/register/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, display_name: displayName }),
    });
    const startData = await startRes.json();

    if (!startRes.ok || !startData.success) {
        return {
            success: false,
            message: startData.message || `Registration start failed (${startRes.status})`,
        };
    }

    // Step 2: Browser creates credential via navigator.credentials.create()
    // webauthn-rs wraps options in { publicKey: {...} } but simplewebauthn wants the inner object
    const optionsJSON = startData.options.publicKey ?? startData.options;
    const credential = await startRegistration({ optionsJSON });

    // Step 3: Send the credential to server for cryptographic verification
    const finishRes = await fetch(`${API_BASE}/api/auth/register/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            user_id: startData.user_id,
            credential,
        }),
    });
    const finishData = await finishRes.json();

    if (!finishRes.ok || !finishData.success) {
        return {
            success: false,
            message: finishData.message || `Registration finish failed (${finishRes.status})`,
        };
    }

    return finishData;
}

/**
 * Real FIDO2 WebAuthn Login Flow:
 *
 * 1. POST /login/start  → server returns RequestChallengeResponse (PublicKeyCredentialRequestOptions)
 * 2. startAuthentication() → browser triggers native prompt (includes "Use a phone or tablet" QR for hybrid transport)
 * 3. POST /login/finish → server verifies the signed assertion against stored credential
 */
export async function authenticatePasskey(username: string): Promise<AuthResult> {
    // Step 1: Get assertion challenge from server
    const startRes = await fetch(`${API_BASE}/api/auth/login/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
    });
    const startData = await startRes.json();

    if (!startRes.ok || !startData.success) {
        return {
            success: false,
            message: startData.message || `Login start failed (${startRes.status})`,
        };
    }

    // Step 2: Browser signs the challenge via navigator.credentials.get()
    // webauthn-rs wraps options in { publicKey: {...} } but simplewebauthn wants the inner object
    const optionsJSON = startData.options.publicKey ?? startData.options;
    const credential = await startAuthentication({ optionsJSON });

    // Step 3: Send the signed assertion to server for cryptographic verification
    const finishRes = await fetch(`${API_BASE}/api/auth/login/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            username,
            credential,
        }),
    });
    const finishData = await finishRes.json();

    if (!finishRes.ok || !finishData.success) {
        return {
            success: false,
            message: finishData.message || `Login finish failed (${finishRes.status})`,
        };
    }

    return finishData;
}
