FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Install dependencies (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application source
COPY financial_assistant/ ./financial_assistant/

# HF Spaces requires port 7860; fallback to 8000 for local dev
ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uv run uvicorn financial_assistant.main:app --host 0.0.0.0 --port ${PORT}"]
