"""
CS Agent FastAPI backend.

Routes:
  GET  /api/health           — liveness check
  POST /api/chat             — SSE streaming chat (text → agent → streamed response)
  POST /api/asr              — audio file → transcript text (proxy to Parakeet NIM)
  POST /api/tts              — text → audio stream (proxy to Personaplex NIM)
  GET  /api/pipeline/status  — pipeline health for frontend Pipeline Monitor tab
"""

import json
import os
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

import agent as cs_agent

MILVUS_HOST = os.environ["MILVUS_HOST"]
MILVUS_PORT = int(os.environ.get("MILVUS_PORT", "19530"))
NFS_CURATED_PATH = Path(os.environ.get("NFS_CURATED_PATH", "/data/curated"))
NIM_URLS = {
    "qwen": os.environ.get("LLM_BASE_URL", ""),
    "embed": os.environ.get("EMBED_BASE_URL", ""),
}

app = FastAPI(title="CS Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Chat (SSE streaming)
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    messages: list[dict]  # [{role: "user", content: "..."}, ...]


@app.post("/api/chat")
async def chat(req: ChatRequest):
    tool_calls_log: list[dict] = []

    def on_tool_call(name: str, args: dict):
        tool_calls_log.append({"name": name, "args": args})

    async def generate():
        # Send tool call events first as they accumulate during streaming
        pending_tools: list[dict] = []

        def tool_callback(name: str, args: dict):
            pending_tools.append({"name": name, "args": args})

        # Wrap sync generator in async
        import asyncio
        loop = asyncio.get_event_loop()

        gen = cs_agent.chat_stream(req.messages, on_tool_call=tool_callback)
        try:
            while True:
                # Flush any pending tool calls as SSE events
                while pending_tools:
                    tc = pending_tools.pop(0)
                    yield {
                        "event": "tool_call",
                        "data": json.dumps(tc),
                    }

                chunk = await loop.run_in_executor(None, next, gen, None)
                if chunk is None:
                    break
                yield {"event": "delta", "data": chunk}

            # Flush any remaining tool calls
            for tc in pending_tools:
                yield {"event": "tool_call", "data": json.dumps(tc)}

            yield {"event": "done", "data": ""}
        except StopIteration:
            yield {"event": "done", "data": ""}

    return EventSourceResponse(generate())


# ---------------------------------------------------------------------------
# Pipeline status (for Pipeline Monitor tab)
# ---------------------------------------------------------------------------

@app.get("/api/pipeline/status")
async def pipeline_status():
    status: dict = {
        "curation": {"complete": False, "report": None},
        "ingestion": {"complete": False, "collections": {}},
        "nims": {},
    }

    # Curation report
    report_path = NFS_CURATED_PATH / "curation_report.json"
    if report_path.exists():
        try:
            status["curation"]["complete"] = True
            status["curation"]["report"] = json.loads(report_path.read_text())
        except Exception:
            pass

    # Milvus collection sizes
    try:
        from pymilvus import connections, Collection, utility
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT, timeout=5)
        for col_name in ["customer_records", "return_policy", "rma_exceptions"]:
            if utility.has_collection(col_name):
                col = Collection(col_name)
                status["ingestion"]["collections"][col_name] = col.num_entities
                status["ingestion"]["complete"] = True
    except Exception:
        pass

    # NIM health checks — embed uses /health (vLLM), qwen uses /v1/health/ready
    nim_health_paths = {"embed": "/health", "qwen": "/v1/health/ready"}
    async with httpx.AsyncClient(timeout=5) as client:
        for name, base_url in NIM_URLS.items():
            if not base_url:
                status["nims"][name] = "unknown"
                continue
            try:
                health_path = nim_health_paths.get(name, "/v1/health/ready")
                base = base_url.rstrip("/").removesuffix("/v1")
                r = await client.get(f"{base}{health_path}")
                status["nims"][name] = "ready" if r.status_code == 200 else "not_ready"
            except Exception:
                status["nims"][name] = "unreachable"

    return status
