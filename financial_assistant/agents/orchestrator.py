import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from financial_assistant.config import settings
from financial_assistant.agents.data_agent import make_data_agent
from financial_assistant.agents.budget_agent import make_budget_agent
from financial_assistant.agents.insights_agent import make_insights_agent
from financial_assistant.agents.advisor_agent import make_advisor_agent

logger = logging.getLogger(__name__)

ROUTER_SYSTEM = """\
You are a silent router. You do two things:

1. Rewrite the user's latest message into a STANDALONE question that makes sense
   without any conversation history. Resolve pronouns, references like "how about",
   "what about", "and for", etc. using the conversation context. If the message is
   already standalone, keep it as-is.

2. Pick the specialist agent to handle it:
   - DataAgent: anything about the user's actual financial records — transactions, account balances, spending totals
   - BudgetAgent: anything about budgets — on track, actual vs limits, adjusting limits
   - InsightsAgent: patterns over time — spending trends, unusual months, anomalous transactions
   - AdvisorAgent: forward-looking or educational — savings strategies, tax, financial planning, Philippine institutions

   When ambiguous, pick DataAgent.

Respond in EXACTLY this format (two lines, nothing else):
AGENT: <agent name>
QUERY: <standalone question>"""

_AGENTS = None


def _get_agents():
    global _AGENTS
    if _AGENTS is None:
        _AGENTS = {
            "DataAgent": make_data_agent(),
            "BudgetAgent": make_budget_agent(),
            "InsightsAgent": make_insights_agent(),
            "AdvisorAgent": make_advisor_agent(),
        }
    return _AGENTS


def _get_router_llm():
    return ChatOpenAI(
        model=settings.nvidia_model,
        api_key=settings.nvidia_api_key,
        base_url=settings.nvidia_base_url,
        temperature=0,
        max_retries=2,
        request_timeout=30,
    )


def _parse_route(text: str) -> tuple[str, str]:
    """Parse router response into (agent_name, standalone_query)."""
    agent_name = "DataAgent"
    query = ""
    for line in text.strip().splitlines():
        line = line.strip()
        if line.upper().startswith("AGENT:"):
            agent_name = line.split(":", 1)[1].strip().split()[0]
        elif line.upper().startswith("QUERY:"):
            query = line.split(":", 1)[1].strip()
    return agent_name, query


async def route_and_stream(message: str, history: list):
    """Classify intent, rewrite follow-ups, pick agent, stream its response tokens."""
    # Step 1: Route and rewrite
    router_llm = _get_router_llm()

    # Build router messages with history for context
    router_messages = [SystemMessage(content=ROUTER_SYSTEM)]
    for h in history[-6:]:  # Last 3 exchanges max for context
        role = h.get("role", "user")
        if role == "user":
            router_messages.append(HumanMessage(content=h["content"]))
        else:
            from langchain_core.messages import AIMessage
            router_messages.append(AIMessage(content=h["content"]))
    router_messages.append(HumanMessage(content=message))

    route_response = await router_llm.ainvoke(router_messages)
    agent_name, standalone_query = _parse_route(route_response.content)

    # Fall back to original message if rewrite failed
    if not standalone_query:
        standalone_query = message

    agents = _get_agents()
    executor = agents.get(agent_name, agents["DataAgent"])
    logger.info("Routed to %s | Rewritten query: %s", agent_name, standalone_query[:120])

    # Step 2: Run agent with ONLY the standalone query (no history)
    # This forces the agent to always call tools instead of reusing old answers
    async for event in executor.astream(
        {"messages": [{"role": "user", "content": standalone_query}]},
    ):
        for node_name, node_output in event.items():
            if not isinstance(node_output, dict) or "messages" not in node_output:
                continue
            for msg in node_output["messages"]:
                msg_type = getattr(msg, "type", None)
                if msg_type == "tool":
                    logger.info("Tool result from %s: %s", node_name, str(msg.content)[:200])
                elif msg_type == "ai" and getattr(msg, "tool_calls", None):
                    logger.info("Tool call: %s", msg.tool_calls)
                elif msg_type == "ai" and msg.content:
                    logger.info("AI response from %s (%d chars)", node_name, len(msg.content))
                    yield msg.content
