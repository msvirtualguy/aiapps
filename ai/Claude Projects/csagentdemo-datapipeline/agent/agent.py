"""
CS Agent — Qwen3-32B with function calling and streaming.

Manages conversation history, dispatches tool calls, and yields
streaming text deltas for SSE consumption by the FastAPI endpoint.
"""

from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import Generator
from typing import Any

from openai import OpenAI

import tools as t

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [AGENT] %(levelname)s %(message)s",
)
log = logging.getLogger("agent")

LLM_BASE_URL = os.environ["LLM_BASE_URL"]
LLM_MODEL = os.environ.get("LLM_MODEL", "qwen3-32b")

SYSTEM_PROMPT = """You are Emerson, a professional customer service agent for Apex Server Infrastructure (ASI), \
a server hardware manufacturer and retailer. You help customers with product returns and RMA (Return Merchandise Authorization) requests.

When a customer contacts you about a defective product:
1. Greet them warmly and ask for their ASI account ID (format: ACC-XXXXX) if not provided.
2. Use lookup_customer to verify their account using their account ID.
3. Ask what product they need to return and approximately when they purchased it.
4. Use check_return_policy to determine eligibility based on product category and days since purchase.
5. Use check_rma_exceptions to check for any special handling applicable to their specific SKU or defect type.
6. Make a clear decision (approved / denied / escalated) and explain why.
7. Use create_rma_ticket to formalize the decision. For order_id, use any order reference the customer provides, \
or generate a reference like "ACCT-{account_id}" if none is available.

Be concise, professional, and empathetic. State your decisions clearly. \
If you create an RMA ticket, include the ticket number in your response."""


def _client() -> OpenAI:
    return OpenAI(base_url=LLM_BASE_URL, api_key="not-needed")


def _execute_tool(tool_name: str, args: dict) -> str:
    fn = t.TOOL_DISPATCH.get(tool_name)
    if fn is None:
        log.warning("TOOL unknown: %s", tool_name)
        return f"Unknown tool: {tool_name}"
    t0 = time.perf_counter()
    try:
        result = fn(**args)
        elapsed = (time.perf_counter() - t0) * 1000
        log.info("TOOL %-30s args=%s  [%.0fms]", tool_name, json.dumps(args), elapsed)
        log.info("     result: %s", result[:200].replace("\n", " "))
        return result
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        log.error("TOOL %-30s FAILED [%.0fms]: %s", tool_name, elapsed, e)
        return f"Tool error: {e}"


def chat_stream(
    messages: list[dict],
    on_tool_call: callable | None = None,
) -> Generator[str, None, None]:
    """
    Run the agentic loop with streaming.

    Yields text delta strings. Tool calls are handled internally;
    tool call events are reported via on_tool_call(name, args) callback
    so the frontend can display ToolCallBadge indicators.

    messages: full conversation history (role/content dicts).
    """
    client = _client()
    history = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    turn = 0
    session_start = time.perf_counter()

    log.info("TURN start — history depth: %d messages", len(history))

    while True:
        turn += 1
        t0 = time.perf_counter()
        stream = client.chat.completions.create(
            model=LLM_MODEL,
            messages=history,
            tools=t.TOOLS,
            tool_choice="auto",
            stream=True,
        )

        # Accumulate the streaming response
        accumulated_content = ""
        accumulated_tool_calls: dict[int, dict] = {}
        finish_reason = None
        token_count = 0

        for chunk in stream:
            choice = chunk.choices[0] if chunk.choices else None
            if choice is None:
                continue

            finish_reason = choice.finish_reason

            delta = choice.delta
            if delta.content:
                accumulated_content += delta.content
                token_count += 1
                yield delta.content

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in accumulated_tool_calls:
                        accumulated_tool_calls[idx] = {
                            "id": tc.id or "",
                            "name": "",
                            "arguments": "",
                        }
                    if tc.function:
                        if tc.function.name:
                            accumulated_tool_calls[idx]["name"] += tc.function.name
                        if tc.function.arguments:
                            accumulated_tool_calls[idx]["arguments"] += tc.function.arguments

        elapsed = (time.perf_counter() - t0) * 1000
        log.info(
            "LLM  turn=%d  finish=%s  tokens≈%d  [%.0fms]",
            turn, finish_reason, token_count, elapsed,
        )

        # If no tool calls, conversation turn is complete
        if finish_reason != "tool_calls" or not accumulated_tool_calls:
            log.info(
                "DONE turn=%d  total_turns=%d  session=[%.0fms]",
                turn, turn, (time.perf_counter() - session_start) * 1000,
            )
            history.append({"role": "assistant", "content": accumulated_content})
            break

        # Append assistant turn with tool call requests
        tool_call_list = []
        for idx in sorted(accumulated_tool_calls.keys()):
            tc = accumulated_tool_calls[idx]
            tool_call_list.append({
                "id": tc["id"],
                "type": "function",
                "function": {"name": tc["name"], "arguments": tc["arguments"]},
            })
        history.append({"role": "assistant", "content": accumulated_content or None, "tool_calls": tool_call_list})

        # Execute tool calls and append results
        for tc in tool_call_list:
            name = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"])
            except json.JSONDecodeError:
                args = {}

            if on_tool_call:
                on_tool_call(name, args)

            result = _execute_tool(name, args)
            history.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result,
            })
