-- Migration: 002_user_profiles
-- Stores the 13-question Financial Niti questionnaire answers + AI-generated analysis

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    questionnaire JSONB NOT NULL,          -- all 13 answers as structured JSON
    health_score INTEGER,                   -- AI-generated (0-100) using 50-30-20 rule
    personality_badge TEXT,                  -- e.g. "The Prudent Guardian", "The Growth Architect"
    ai_insights JSONB,                      -- 3 actionable insight cards from DeepSeek
    risk_category TEXT,                     -- Conservative / Moderate / Aggressive
    savings_ratio REAL,                     -- derived: savings as % of income
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
