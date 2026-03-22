from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Financial Assistant AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Widened from localhost for Coolify cross-domain deployment
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Conversation-Id"],  # Required for frontend to read conversation ID header
)

from financial_assistant.routers import health, chat, categorize

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(categorize.router)
