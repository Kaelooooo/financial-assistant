from contextvars import ContextVar

# Holds the authenticated user_id for the current async request.
# Set by route handlers before calling the agent/tools; read by tools.
current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")
