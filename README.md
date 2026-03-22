# Ledger - Personal Financial Assistant

A full-stack personal finance tracker with an AI-powered multi-agent assistant. Built with **Next.js**, **FastAPI**, **LangChain**, and **Supabase**.

## Features

- **AI Chat** - Ask questions about your finances in natural language. Powered by a LangChain multi-agent system that routes queries to specialized agents (Data, Budget, Insights, Advisor).
- **Transaction Management** - Add, import (CSV/OFX), and inline-edit transactions with category, account, date, and amount fields.
- **Budget Tracking** - Create budgets per category and track actual spending against limits.
- **Spending Insights** - Month-over-month comparisons, trend detection, and anomaly flagging.
- **Financial Advice** - Savings rate calculations, emergency fund guidance, and investment suggestions tailored to the Philippine financial system.
- **Dashboard** - Overview of account balances, recent transactions, and net worth.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | FastAPI, Python 3.12 |
| AI/Agents | LangChain, LangGraph, NVIDIA NIM API |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Styling | Custom CSS |

## Architecture

```
User  -->  Next.js Frontend  -->  FastAPI Backend  -->  Supabase (PostgreSQL)
                                       |
                                  Orchestrator (LLM Router)
                                       |
                          +------------+------------+------------+
                          |            |            |            |
                     DataAgent   BudgetAgent  InsightsAgent  AdvisorAgent
                          |            |            |            |
                     Supabase      Supabase     Supabase     Web Search
                      Tools         Tools        Tools       + Supabase
```

The orchestrator rewrites follow-up questions into standalone queries and routes them to the appropriate agent. Each agent has its own tools and system prompt. Agents always call tools before responding — they never fabricate financial data.

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- A [Supabase](https://supabase.com) project
- An [NVIDIA NIM](https://build.nvidia.com) API key

### Backend

```bash
# Install dependencies
uv sync

# Copy and fill in environment variables
cp .env.example .env

# Run database migrations (apply SQL files in supabase/migrations/ in order via the Supabase dashboard)

# Start the backend
uv run uvicorn financial_assistant.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd web

# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local

# Start the frontend
npm run dev
```

### Environment Variables

**Backend (`.env`):**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Anonymous/public key |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification |
| `NVIDIA_API_KEY` | NVIDIA NIM API key |
| `NVIDIA_MODEL` | Model name (default: `moonshotai/kimi-k2-instruct`) |
| `NVIDIA_BASE_URL` | NVIDIA API base URL |

**Frontend (`web/.env.local`):**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous/public key |
| `NEXT_PUBLIC_AI_SERVICE_URL` | Backend API URL (default: `http://localhost:8000`) |

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Set root directory to `web`, add `NEXT_PUBLIC_*` env vars |
| Backend | Docker (HF Spaces, Render, etc.) | Dockerfile included, set env vars as secrets |

## License

MIT
