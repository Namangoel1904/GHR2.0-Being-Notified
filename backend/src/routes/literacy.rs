use axum::{routing::get, Json, Router};
use serde::Serialize;
use std::sync::Arc;

use crate::AppState;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct LiteracyTopic {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub difficulty: String, // "beginner" | "intermediate" | "advanced"
    pub category: String,
    pub read_time_minutes: i32,
    pub content: String,
}

// ─── Route ──────────────────────────────────────────────────────────────────

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/topics", get(get_topics))
}

// ─── Handler ────────────────────────────────────────────────────────────────

async fn get_topics() -> Json<Vec<LiteracyTopic>> {
    Json(vec![
        LiteracyTopic {
            id: "budgeting-101".into(),
            title: "Budgeting 101: The 50/30/20 Rule".into(),
            summary: "Learn the simplest and most effective budgeting framework used worldwide."
                .into(),
            difficulty: "beginner".into(),
            category: "Budgeting".into(),
            read_time_minutes: 5,
            content: "The 50/30/20 rule divides your after-tax income into three categories:\n\n\
                **50% — Needs:** Rent, groceries, insurance, minimum debt payments.\n\
                **30% — Wants:** Dining out, entertainment, subscriptions, hobbies.\n\
                **20% — Savings & Debt:** Emergency fund, investments, extra debt payments.\n\n\
                This framework works because it's simple enough to follow without spreadsheets, \
                yet structured enough to build real financial discipline.".into(),
        },
        LiteracyTopic {
            id: "emergency-fund".into(),
            title: "Why You Need an Emergency Fund".into(),
            summary: "An emergency fund is the foundation of financial security. Here's how to build one.".into(),
            difficulty: "beginner".into(),
            category: "Savings".into(),
            read_time_minutes: 4,
            content: "An emergency fund covers 3-6 months of essential expenses. \
                Start with ₹1,000 as a mini goal, then build to one month's expenses. \
                Keep it in a high-yield savings account — accessible but separate from daily spending.".into(),
        },
        LiteracyTopic {
            id: "compound-interest".into(),
            title: "The Magic of Compound Interest".into(),
            summary: "Understanding how your money grows exponentially over time.".into(),
            difficulty: "intermediate".into(),
            category: "Investing".into(),
            read_time_minutes: 6,
            content: "Compound interest means earning interest on your interest. \
                If you invest ₹10,000 at 8% annual return:\n\
                - Year 1: ₹10,800\n- Year 10: ₹21,589\n- Year 30: ₹1,00,627\n\n\
                The key insight: **time in the market beats timing the market.** \
                Starting early, even with small amounts, dramatically outperforms starting late with large sums.".into(),
        },
        LiteracyTopic {
            id: "debt-avalanche".into(),
            title: "Debt Avalanche vs Debt Snowball".into(),
            summary: "Two proven strategies to eliminate debt systematically.".into(),
            difficulty: "intermediate".into(),
            category: "Debt Management".into(),
            read_time_minutes: 7,
            content: "**Avalanche (Math-Optimal):** Pay minimums on all debts, throw extra money at the \
                highest interest rate debt first. Saves the most money.\n\n\
                **Snowball (Psychology-Optimal):** Pay off smallest balance first for quick wins. \
                The motivation boost helps people stick with the plan.\n\n\
                Both work. Choose the one that matches your personality.".into(),
        },
    ])
}
