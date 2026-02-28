<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Development-emerald?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Local%20Only-green?style=for-the-badge" />
</p>

# 🛡️ FinAegis — AI-Powered Financial Advisory Platform

> **Privacy-first, passwordless, AI-driven financial coaching — everything runs on your device.**

FinAegis helps everyday users with limited financial literacy get **actionable budgeting and savings advice** from a local AI engine. No cloud. No passwords. No data leaks.

---

## 🎯 Problem Statement

1. **Financial Literacy Gap** — Most people don't know how to budget, save, or invest effectively.
2. **Privacy Concerns** — Users hesitate to share sensitive financial data with cloud-based apps.
3. **Password Fatigue** — Passwords are insecure and annoying. Phishing attacks are rampant.

## 💡 Our Solution

| Feature | How It Works |
|---------|-------------|
| **Local AI Advisor** | DeepSeek-R1 (8B) runs on your GPU via Ollama. Your data never leaves your machine. |
| **Explainable AI** | Every suggestion shows its reasoning via Chain-of-Thought — no black-box answers. |
| **Passwordless Login** | FIDO2 passkeys + biometrics. Your phone becomes your hardware token (QR → Bluetooth). |
| **End-to-End Encryption** | All financial data encrypted with AES-256-GCM before it touches the database. |
| **Smart Alerts** | Detects unusual spending (200%+ above your 7-day average) and notifies you instantly. |
| **Risk Profiling** | A 5-question quiz tailors all AI advice to your risk tolerance (Conservative/Moderate/Aggressive). |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     User's Machine                      │
│                                                         │
│  ┌──────────┐    HTTP     ┌──────────┐    SSE Stream    │
│  │ Next.js  │ ◄────────► │   Rust   │ ◄──────────────► │
│  │ Frontend │    :3000    │  (Axum)  │    :11434        │
│  └──────────┘             │  :8080   │  ┌────────────┐  │
│       │                   └──────────┘  │   Ollama    │  │
│       │ WebAuthn                │       │ DeepSeek-R1 │  │
│       │ (FIDO2)            sqlx │       │   (GPU)     │  │
│       ▼                        ▼       └────────────┘  │
│  ┌──────────┐         ┌──────────────┐                  │
│  │  Phone   │  BLE    │  PostgreSQL  │                  │
│  │ (Token)  │ ◄─────► │  (AES-256)   │                  │
│  └──────────┘         └──────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

**Everything stays local.** The only external call is the optional `ngrok` tunnel for mobile WebAuthn testing.

---

## 🧰 Tech Stack

### Frontend (`frontend/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16 (App Router) | React framework with file-based routing, SSR, Turbopack |
| **TypeScript** | 5.x | Type safety across the entire frontend |
| **Tailwind CSS** | 4.x | Utility-first CSS with custom dark emerald theme |
| **Framer Motion** | 12.x | Animations — page transitions, hover effects, progress bars |
| **Recharts** | 2.x | Financial charts — area, bar, pie/donut with custom tooltips |
| **SWR** | 2.x | Data fetching with caching, revalidation, and smart fallbacks |
| **react-markdown** | 9.x | Renders AI responses as formatted Markdown in real-time |
| **react-hot-toast** | 2.x | Toast notifications for spending alerts |
| **@simplewebauthn/browser** | 13.x | WebAuthn passkey registration & authentication |
| **qrcode.react** | 4.x | QR code generation for hybrid transport (phone-as-token) |
| **Lucide React** | — | Icon library |

### Backend (`backend/`)

| Technology | Purpose |
|-----------|---------|
| **Rust** | Systems language — memory-safe, fast, no garbage collector |
| **Axum** | Async web framework built on Tokio |
| **sqlx** | Compile-time checked SQL queries for PostgreSQL |
| **webauthn-rs** | FIDO2/WebAuthn server-side implementation |
| **aes-gcm** | AES-256-GCM authenticated encryption for financial data |
| **reqwest** | HTTP client for Ollama API proxying |
| **serde** | JSON serialization/deserialization |
| **tokio** | Async runtime |

### Infrastructure

| Tool | Purpose |
|------|---------|
| **PostgreSQL 16** | Primary database (via Docker) |
| **Ollama** | Local LLM runtime — runs DeepSeek-R1:8b on GPU |
| **Docker Compose** | Container orchestration (PostgreSQL only) |
| **ngrok** | HTTPS tunnel for mobile WebAuthn testing |

---

## 📁 Project Structure

```
GHR2.0/
├── frontend/                    # Next.js 16 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page (hero, features)
│   │   │   ├── auth/page.tsx    # Passkey login + QR hybrid flow
│   │   │   ├── dashboard/       # Financial dashboard with charts
│   │   │   ├── advisor/         # AI chat with CoT visualization
│   │   │   ├── onboarding/      # Risk profiling quiz
│   │   │   ├── literacy/        # Financial education hub
│   │   │   ├── layout.tsx       # Root layout (dark mode, fonts)
│   │   │   └── globals.css      # Design system (emerald theme)
│   │   ├── components/
│   │   │   └── Navbar.tsx       # Glassmorphic navigation bar
│   │   ├── hooks/
│   │   │   └── useFinancialData.ts  # SWR hooks for all API data
│   │   └── lib/
│   │       ├── ai-stream.ts     # SSE streaming + CoT parser
│   │       ├── webauthn.ts      # Passkey registration/auth
│   │       └── utils.ts         # Helpers (cn, fetch, formatters)
│   └── package.json
│
├── backend/                     # Rust/Axum API Server
│   ├── src/
│   │   ├── main.rs              # Server setup, routes, Ollama proxy
│   │   ├── auth/                # WebAuthn handlers
│   │   ├── crypto/mod.rs        # AES-256-GCM encryption
│   │   ├── models/              # Database models (User, Transaction)
│   │   └── routes/
│   │       ├── dashboard.rs     # Spending, alerts, goals APIs
│   │       ├── profile.rs       # Risk quiz + scoring
│   │       └── literacy.rs      # Financial education content
│   ├── migrations/              # PostgreSQL schema (7 tables)
│   └── Cargo.toml
│
├── docker-compose.yml           # PostgreSQL container
├── .env                         # Configuration (DB, Ollama, keys)
└── README.md                    # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** toolchain (`rustup`)
- **Docker Desktop** (for PostgreSQL)
- **Ollama** (local install, not Docker — for GPU access)
- **GPU** with ≥6GB VRAM (RTX 4060 recommended)

### 1. Clone & Install

```bash
git clone <repo-url> GHR2.0
cd GHR2.0

# Frontend
cd frontend && npm install && cd ..

# Backend (first build takes a few minutes)
cd backend && cargo build && cd ..
```

### 2. Start Infrastructure

```bash
# PostgreSQL
docker-compose up -d

# Ollama + AI Model
ollama serve
ollama pull deepseek-r1:8b
```

### 3. Run the App

```bash
# Terminal 1: Backend (port 8080)
cd backend && cargo run

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev
```

### 4. Open in Browser

Visit **http://localhost:3000**

> **For mobile WebAuthn testing:**
> ```bash
> ngrok http 3000
> ```
> Use the ngrok HTTPS URL on your phone to scan the QR code.

---

## 📄 Pages & Features

### `/` — Landing Page
Hero section with animated feature grid showcasing the 4 pillars: Passwordless Auth, Local AI, Explainable AI, and E2E Encryption.

### `/auth` — Passwordless Authentication
- Register/login with FIDO2 passkeys (fingerprint, Face ID, security key)
- **QR Code → Phone Scan → Bluetooth Proximity Check → Biometric Verify**
- "Proximity Verified ✓" badge appears after BLE handshake
- Private keys never leave the device — only public key assertions are transmitted

### `/dashboard` — Financial Dashboard
- **Health Score Gauge** — Animated SVG circular progress (0-100)
- **Income vs Spending** — 6-month area chart with gradient fills
- **Spending Breakdown** — Interactive donut chart with category legend
- **Alerts Panel** — Color-coded by severity (low/medium/high)
- **Savings Goals** — Animated progress bars with target tracking
- **Smart Alerts** — Toast notifications when spending spikes 200%+ above 7-day average
- All data fetched via SWR with loading skeletons and error recovery

### `/advisor` — AI Financial Advisor
- **SSE Streaming** — AI response appears word-by-word in real-time
- **Markdown Rendering** — Bold, lists, code blocks, headers rendered live
- **Chain-of-Thought** — Pulsing "AI is reasoning..." indicator during `<think>` blocks, then expandable "View Logic" accordion
- **Risk-Aware** — System prompt automatically includes your risk profile from the quiz
- **Stop Button** — Abort streaming mid-response
- **Suggested Prompts** — Pre-built questions for quick start

### `/onboarding` — Risk Profiling Quiz
- 5 questions with animated transitions
- Progress bar
- Results: health score gauge, category breakdown bars, personalized recommendations
- Saves profile to localStorage → AI advisor reads it automatically

### `/literacy` — Financial Education Hub
- Expandable topic cards (Budgeting 101, Emergency Funds, Compound Interest, Debt Strategies)
- Difficulty badges (beginner/intermediate)
- Read time estimates

---

## 🔒 Security Architecture

| Layer | Implementation |
|-------|---------------|
| **Authentication** | FIDO2 WebAuthn — no passwords stored anywhere |
| **Transport** | CTAP2 Hybrid Transport (QR → BLE proximity) |
| **Data at Rest** | AES-256-GCM encryption on all financial fields |
| **Data in Transit** | HTTPS via ngrok (production: TLS certificates) |
| **AI Processing** | 100% local — Ollama on localhost, no cloud API calls |
| **Key Management** | Private keys stay in hardware authenticator (TPM/Secure Enclave) |
| **Frontend Security** | Only handles public key assertions, never sees private keys |

---

## 🧪 Build Verification

```
✓ npm run build — Compiled in 3.0s (Next.js 16.1.6, Turbopack)
✓ 7 routes statically generated
✓ 0 TypeScript errors
✓ 0 ESLint errors
```

---

## 📜 License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with 🛡️ for the National Hackathon<br>
  <em>Privacy is not a feature. It's a right.</em>
</p>
