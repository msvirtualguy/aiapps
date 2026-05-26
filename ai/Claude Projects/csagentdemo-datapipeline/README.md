# Purrfect Emerson — CS Agent Demo

An end-to-end AI customer service agent demo for **Apex Server Infrastructure (ASI)**, a server hardware manufacturer. Emerson handles defective-product returns and RMA (Return Merchandise Authorization) requests — from first contact to structured decision — entirely on a single **NVIDIA DGX Spark**.

**Two NVIDIA capabilities showcased:**
1. **NeMo Curator** — PII detection and redaction before data enters the vector store
2. **DGX Spark as a self-contained inference server** — four NIMs running concurrently on a single GB10 Grace Blackwell module

---

## Hardware

| Component | Spec |
|-----------|------|
| System | NVIDIA DGX Spark |
| SoC | GB10 Grace Blackwell Superchip |
| GPU | Blackwell B1 (SM 12.1) |
| Unified Memory | 128 GB LPDDR5X |
| Storage | 1 TB NVMe |
| OS | Ubuntu 22.04 (ARM64) |
| Orchestration | k3s (single-node) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (text or voice)                                                │
│                                                                         │
│    ┌─────────────────────────────────────────────────────────────────┐  │
│    │  Next.js Frontend  (Chat tab + Pipeline Monitor tab)            │  │
│    │  shadcn/ui · Tailwind · dark enterprise theme                   │  │
│    └────────────┬──────────────┬──────────────┬───────────────────── ┘  │
│                 │ SSE /chat    │ POST /asr    │ POST /tts               │
└─────────────────┼──────────────┼──────────────┼─────────────────────────┘
                  │              │              │
                  ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FastAPI Agent Backend  (cs-agent namespace)                            │
│                                                                         │
│    ┌───────────────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│    │  Qwen3.6-35B-A3B NIM  │   │  Parakeet    │   │  Kokoro TTS     │  │
│    │  (function calling +  │   │  ASR NIM     │   │  (hexgrad/      │  │
│    │   streaming)          │   │  audio→text  │   │  Kokoro-82M)    │  │
│    └────────────┬──────────┘   └──────────────┘   └─────────────────┘  │
│                 │ tool calls                                             │
│    ┌────────────▼──────────────────────────────────────────────────┐    │
│    │  Agent Tools                                                   │    │
│    │  lookup_customer · check_return_policy                        │    │
│    │  check_rma_exceptions · create_rma_ticket                     │    │
│    └────────────┬──────────────────────────────────────────────────┘    │
│                 │ RAG (pymilvus + httpx)                                 │
│    ┌────────────▼──────────────────────────────────────────────────┐    │
│    │  Milvus Vector Store  (cs-pipeline namespace)                 │    │
│    │  customer_records · return_policy · rma_exceptions            │    │
│    └────────────┬──────────────────────────────────────────────────┘    │
│                 │ embedding queries                                       │
│    ┌────────────▼──────────────────────────────────────────────────┐    │
│    │  nv-embedqa NIM  (nvidia/llama-3.2-nv-embedqa-1b-v2)          │    │
│    └───────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Pipeline

Raw business data contains PII. The pipeline ensures **no raw PII ever reaches the vector store**.

```
NFS Share (192.168.110.200:/volume1/k3s/data)
  │
  ├── customer_orders.xlsx   ← names, emails, phones, addresses
  ├── return_policy.docx     ← company RMA policy document
  └── rma_exceptions.txt     ← manufacturing batch / exception rules
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 1 — NeMo Curator  (RayJob, cs-pipeline ns)  │
│                                                      │
│  Primary:  NeMo PiiModifier (GPU-accelerated)       │
│  Fallback: Regex redaction (EMAIL, PHONE, SSN)      │
│                                                      │
│  Entities replaced with typed tokens:               │
│    john.smith@example.com  →  [EMAIL]               │
│    +1-555-4821             →  [PHONE]               │
│    123 Main St             →  [LOCATION]            │
│                                                      │
│  Preserved (non-PII keys):                          │
│    Account_Member_ID, device_serial, sku            │
│                                                      │
│  Output:  /data/curated/                            │
│           curation_report.json  (stats + breakdown) │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Stage 2 — Chunking + Embedding  (k8s Job)          │
│                                                      │
│  customer_orders.csv  → one vector per row          │
│    metadata: customer_id, order_id                  │
│                                                      │
│  return_policy / rma_exceptions → text chunks       │
│    chunk_size=768 / 512, overlap=64 words           │
│                                                      │
│  Embedding: nv-embedqa NIM (2048-dim COSINE HNSW)  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Milvus Standalone  (cs-pipeline namespace)         │
│                                                      │
│  customer_records  — exact-match by customer_id     │
│  return_policy     — semantic search                │
│  rma_exceptions    — semantic search                │
└─────────────────────────────────────────────────────┘
```

---

## Agent Reasoning Loop

Each customer message triggers a multi-step agentic loop with streaming output:

```
User: "My PCIe riser cable is dead, account ACC-10492"
         │
         ▼
┌────────────────────┐
│  Qwen3.6-35B-A3B   │  ← streaming tokens yielded to SSE
│  (function calling) │
└────────┬───────────┘
         │ tool_calls[]
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  1. lookup_customer("ACC-10492")                         │
  │     → Milvus exact-match query on customer_id field      │
  │     → returns: John Smith | Seattle, WA | [EMAIL]        │
  │                                                          │
  │  2. check_return_policy("PCIe Riser Cable", 45)          │
  │     → semantic search on return_policy collection        │
  │     → returns: policy excerpt with eligibility window    │
  │                                                          │
  │  3. check_rma_exceptions("PCIe-Gen5-Riser", "no signal") │
  │     → semantic search on rma_exceptions collection       │
  │     → returns: Batch #B2026-X thermal fracture alert     │
  │               → advance replacement eligible             │
  │                                                          │
  │  4. create_rma_ticket(customer_id, ..., "approved")      │
  │     → generates RMA-YYYYMM-XXXXX number                  │
  │     → returns structured ticket JSON                     │
  └──────────────────────────────────────────────────────────┘
         │
         ▼
  Agent streams final response + RMACard renders in UI
```

Tool calls are surfaced to the frontend as `event: tool_call` SSE events and rendered as `ToolCallBadge` components in real time, showing the agent's work as it happens.

---

## Voice Flow

```
  User clicks 🎤
       │
       ▼  MediaRecorder (audio/webm;codecs=opus)
  User speaks → clicks 🎤 again
       │
       ▼  POST /api/asr  (audio blob)
  Agent backend → Parakeet ASR NIM
       │  {"transcript": "..."}
       ▼
  Transcript injected as user message
       │
       ▼  POST /api/chat  (SSE stream)
  Agent reasons + streams text response
       │  event: done
       ▼
  POST /api/tts  {"text": "...", "voice": "af_heart"}
  Agent backend → Kokoro TTS server → audio/wav
       │
       ▼  AudioContext.decodeAudioData → AudioBufferSourceNode.start()
  Browser plays Kokoro voice response
```

Mode indicator in header shows `Voice` or `Text` — TTS playback only fires in voice mode.

---

## Model Stack

| Role | Model | Container | Memory |
|------|-------|-----------|--------|
| LLM (reasoning + function calling) | Qwen/Qwen3.6-35B-A3B | `nvcr.io/nim/qwen/qwen3.6-35b-a3b:latest` | ~20 GB |
| Embeddings | nvidia/llama-3.2-nv-embedqa-1b-v2 | `nvcr.io/nim/nvidia/llama-3.2-nv-embedqa-1b-v2:latest` | ~3 GB |
| ASR | NVIDIA Parakeet CTC 1.1B | `nvcr.io/nim/nvidia/parakeet-ctc-1-1b-asr:latest` | ~2 GB |
| TTS | hexgrad/Kokoro-82M (MIT) | custom `kokoro-tts:latest` | ~1 GB CPU |

> Kokoro TTS runs on CPU — Blackwell SM 12.1 is not yet supported by the standard PyTorch CUDA wheels at time of build.

### Qwen3.6-35B-A3B — MoE Architecture

This is a **Mixture-of-Experts** model: 35B total parameters, ~3B active per token. At NVFP4 precision on a GB10 Blackwell it achieves strong reasoning and reliable function calling within the 20 GB memory envelope.

To enable chain-of-thought reasoning (adds `<think>` block before response):
```python
extra_body={"chat_template_kwargs": {"enable_thinking": True}}
```
Currently disabled in production — adds latency to the demo loop.

---

## Kubernetes Namespaces

```
cs-inference   NIM deployments (Qwen, embedqa, Parakeet, Kokoro TTS)
cs-pipeline    Milvus, KubeRay, curator job, ingest job, NFS PVCs
cs-agent       FastAPI backend, Next.js frontend, app ingress
monitoring     kube-prometheus-stack (Prometheus + Grafana)
```

---

## Ingress Topology

```
/etc/hosts entries required on workstation:
  <DGX_SPARK_IP>  spark.local
  <DGX_SPARK_IP>  csagent.local

spark.local  (nginx ingress — rewrite-based path routing)
  /nim/qwen/    →  qwen-nim.cs-inference:8000
  /nim/embed/   →  embedding-nim.cs-inference:8000
  /nim/asr/     →  asr-nim.cs-inference:8000
  /nim/tts/     →  tts-nim.cs-inference:8000
  /ray          →  raycluster-head-svc.cs-pipeline:8265
  /grafana      →  kube-prometheus-stack-grafana.monitoring:80

csagent.local  (Traefik — k3s default)
  /api          →  cs-agent-backend.cs-agent:8000
  /             →  cs-agent-frontend.cs-agent:3000
```

Both use self-signed TLS via cert-manager (`selfsigned-issuer`).

> **Note:** The NIM endpoints use nginx ingress for path-rewriting (`/nim/qwen/` → `/`). The app endpoints use Traefik, which is k3s's built-in controller. Two ingress classes coexist.

---

## Memory Budget

| Component | Memory | Always-on? |
|-----------|--------|------------|
| Qwen3.6-35B-A3B NIM | ~20 GB | Yes |
| nv-embedqa NIM | ~3 GB | Yes |
| Parakeet ASR NIM | ~2 GB | Yes |
| Kokoro TTS | ~1 GB | Yes |
| Milvus + etcd + MinIO | ~6 GB | Yes |
| Prometheus + Grafana | ~3 GB | Yes |
| Agent backend | ~2 GB | Yes |
| Frontend | ~0.5 GB | Yes |
| k3s + OS | ~4 GB | Yes |
| **Steady-state total** | **~41.5 GB** | — |
| NeMo Curator (pipeline only) | ~8 GB | No |
| NV-Ingest job (pipeline only) | ~4 GB | No |
| **Peak (pipeline running)** | **~53.5 GB** | — |

Peak is well within the 128 GB unified memory envelope.

---

## File Structure

```
csagentdemo-datapipeline/
├── Makefile                         # Deployment targets: foundation|nims|data|pipeline|app|all
├── config/
│   ├── .env.example                 # Committed — placeholder values only
│   └── .env                         # Gitignored — NGC_API_KEY, DGX_SPARK_IP
│
├── k8s/
│   ├── 00-namespaces.yaml           # cs-inference, cs-pipeline, cs-agent
│   ├── 01-gpu-timeslicing.yaml      # 8 virtual GPU replicas via NVIDIA GPU Operator
│   ├── 02-ngc-secret.yaml           # NGC pull secret template (envsubst)
│   ├── 03-nfs-pv-pvc.yaml           # NFS PV/PVC (192.168.110.200:/volume1/k3s/data)
│   ├── 04-milvus-values.yaml        # Milvus Helm values (standalone mode)
│   ├── 05-nim-embedding.yaml        # nv-embedqa NIM deployment + service
│   ├── 06-nim-qwen.yaml             # Qwen3.6-35B-A3B NIM deployment + service
│   ├── 07-nim-asr.yaml              # Parakeet ASR NIM deployment + service
│   ├── 08-nim-tts.yaml              # Kokoro TTS deployment + service
│   ├── 09-nim-ingress.yaml          # spark.local nginx ingress (NIM + Ray + Grafana)
│   ├── 10-nim-registry-configmap.yaml  # Model endpoint URLs consumed by agent + jobs
│   ├── 11-ray-cluster.yaml          # KubeRay single-node RayCluster
│   ├── 11-curator-job.yaml          # NeMo Curator RayJob (PII curation)
│   ├── 12-nv-ingest-job.yaml        # Ingest job (chunking + embedding → Milvus)
│   ├── 13-agent-backend.yaml        # FastAPI backend Deployment + Service
│   ├── 14-frontend.yaml             # Next.js frontend Deployment + Service
│   └── 15-app-ingress.yaml          # csagent.local Traefik ingress (TLS)
│
├── pipeline/
│   ├── curator_job.py               # NeMo Curator entrypoint (PII detection + redaction)
│   ├── run_ingest.py                # Chunking + embedding + Milvus ingest
│   ├── ingest_config.yaml           # Ingest parameters
│   ├── run_pipeline.sh              # Orchestrates curator → ingest in order
│   └── verify_milvus.py             # Post-pipeline validation (collection record counts)
│
├── agent/
│   ├── Dockerfile                   # python:3.11-slim ARM64
│   ├── main.py                      # FastAPI: /api/chat (SSE), /api/asr, /api/tts, /api/pipeline/status
│   ├── agent.py                     # Agentic loop — Qwen3 streaming + tool dispatch
│   ├── rag.py                       # pymilvus direct — exact-match + semantic retrieval
│   ├── tools.py                     # lookup_customer, check_return_policy,
│   │                                #   check_rma_exceptions, create_rma_ticket
│   └── requirements.txt
│
├── tts/
│   ├── Dockerfile                   # Kokoro TTS custom image (ARM64, CPU inference)
│   └── server.py                    # FastAPI: POST /v1/audio/speech → audio/wav
│
└── frontend/
    ├── Dockerfile                   # node:20-alpine multistage build → standalone
    ├── app/
    │   ├── layout.tsx               # Root layout (dark theme, Inter font)
    │   ├── page.tsx                 # Root page → ChatPage
    │   └── api/
    │       ├── chat/route.ts        # SSE proxy: browser → agent backend
    │       ├── asr/route.ts         # Audio proxy: browser → agent backend
    │       ├── tts/route.ts         # Audio proxy: browser → agent backend
    │       └── pipeline/status/     # Pipeline status proxy
    ├── components/
    │   ├── ChatPage.tsx             # Two-tab layout: Chat | Pipeline
    │   ├── ChatWindow.tsx           # Scrolling message list with auto-scroll
    │   ├── MessageInput.tsx         # Textarea + Send + mic button
    │   ├── AgentMessage.tsx         # Streaming text render + inline RMACard
    │   ├── UserMessage.tsx          # User bubble with text/voice icon
    │   ├── ToolCallBadge.tsx        # Real-time tool call indicator (name + args)
    │   ├── RMACard.tsx              # Structured decision card (Approved/Denied/Escalated)
    │   ├── VoiceButton.tsx          # Push-to-talk with waveform animation
    │   └── PipelineMonitor.tsx      # Pipeline status dashboard (polls /api/pipeline/status)
    └── lib/
        ├── stream.ts                # SSE consumer (handles \r\n normalization, final-read edge case)
        ├── audio.ts                 # MediaRecorder → ASR + AudioContext TTS playback
        ├── api.ts                   # Typed fetch wrappers
        └── types.ts                 # Shared TypeScript interfaces
```

---

## Deployment

### Prerequisites

- k3s running on DGX Spark with NVIDIA GPU Operator validated
- NFS share mounted (default: `192.168.110.200:/volume1/k3s/data`)
- `config/.env` populated:
  ```bash
  NGC_API_KEY=nvapi-...
  DGX_SPARK_IP=192.168.110.144
  ```
- `make` and `rsync` on your workstation; `docker` + `kubectl` on the DGX Spark

### Full Deployment (fresh)

```bash
make foundation   # Helm: nfs-csi, cert-manager, ingress-nginx, kuberay, prometheus-stack
make nims         # Deploy NIMs + TTS + ingress at spark.local
make data         # Deploy Milvus standalone
make pipeline     # Run NeMo Curator + ingest jobs → populate Milvus
make app          # Build + deploy backend + frontend at csagent.local
```

Or all at once: `make all`

### Redeploying after code changes

```bash
# Backend only (agent.py, tools.py, rag.py, main.py)
make app   # or manually rsync + docker build + k3s ctr import + rollout restart

# Re-run ingest after pipeline/run_ingest.py changes
kubectl create configmap ingest-script \
  --from-file=run_ingest.py=pipeline/run_ingest.py \
  -n cs-pipeline --dry-run=client -o yaml | kubectl apply -f -
kubectl delete job nv-ingest-job -n cs-pipeline --ignore-not-found
kubectl apply -f k8s/12-nv-ingest-job.yaml   # RESET_COLLECTIONS=true drops + recreates
```

### /etc/hosts (workstation)

```
192.168.110.144  spark.local
192.168.110.144  csagent.local
```

---

## API Reference

### Agent Backend

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `POST` | `/api/chat` | SSE streaming chat. Body: `{"messages": [{role, content}]}` |
| `POST` | `/api/asr` | Audio → transcript. Body: `multipart/form-data` with `audio` field |
| `POST` | `/api/tts` | Text → WAV. Body: `{"text": "...", "voice": "af_heart"}` |
| `GET` | `/api/pipeline/status` | Curation report + Milvus counts + NIM health |

### SSE Event Types (`/api/chat`)

| Event | Data | Description |
|-------|------|-------------|
| `delta` | `string` | Next text token from the LLM |
| `tool_call` | `{"name": "...", "args": {...}}` | Tool invoked by the agent |
| `done` | `""` | Stream complete |

### Model Endpoints (external, via spark.local)

```bash
# Test Qwen3
curl -sk https://spark.local/nim/qwen/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen3.6-35B-A3B","messages":[{"role":"user","content":"hello"}]}'

# Test embeddings
curl -sk https://spark.local/nim/embed/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"nvidia/llama-3.2-nv-embedqa-1b-v2","input":["test"]}'

# NIM health checks
curl -sk https://spark.local/nim/qwen/v1/health/ready
curl -sk https://spark.local/nim/asr/v1/health/ready
curl -sk https://spark.local/nim/tts/v1/health/ready
curl -sk https://spark.local/nim/embed/health   # vLLM uses /health (no /v1)
```

---

## Demo Script (60 seconds)

### Demo customers (from curated dataset)

| Account ID | Name | Location |
|------------|------|----------|
| ACC-10492 | John Smith | Seattle, WA |
| ACC-99421 | Jane Doe | Austin, TX |
| ACC-55218 | Alice Johnson | New York, NY |

### Recommended flow

**1. Open Pipeline Monitor tab** → show the curation report:
- PII entities found and masked (EMAIL, PHONE, LOCATION)
- Milvus collections populated
- NIM health indicators

**2. Switch to Chat tab** → type:
> *"Hi, I have a defective PCIe riser cable I'd like to return"*

Agent asks for account ID → reply:
> *"ACC-10492"*

**3. Watch tool badges appear in real time:**
```
🔧 lookup_customer         ACC-10492         ✓
🔧 check_return_policy     PCIe Riser, 45d   ✓
🔧 check_rma_exceptions    Batch #B2026-X    ✓
🔧 create_rma_ticket       approved          ✓
```

The PCIe Gen5 Riser Cable is a great demo item — it matches the `rma_exceptions` data about manufacturing batch `#B2026-X` thermal fracture defects, triggering advance replacement handling.

**4. RMACard renders inline:**
```
┌────────────────────────────────────────────┐
│  RMA APPROVED                              │
│  RMA #: RMA-202605-83741                   │
│  Customer: John Smith (ACC-10492)          │
│  Item: PCIe Gen5 Riser Cable               │
│  Decision: Advance Replacement             │
│  Timeline: 2 business days                 │
│  Prepaid label emailed to [EMAIL]          │
└────────────────────────────────────────────┘
```

**5. Voice mode:** Click 🎤 → speak the same request → Kokoro TTS reads the response aloud.

### What the story covers

- **Data curation**: Raw PII was in the dataset. NeMo Curator masked it before it ever touched the vector store. Emails show as `[EMAIL]` in retrieved records.
- **RAG over company data**: The agent retrieves relevant policy chunks and exception rules, not just LLM training knowledge.
- **Structured reasoning**: The agent follows a prescribed workflow (lookup → policy → exceptions → ticket) using function calling, not free-form generation.
- **DGX Spark**: All four models (LLM, embeddings, ASR, TTS) run concurrently on a single DGX Spark.

---

## Pipeline Monitor

The **Pipeline** tab in the frontend polls `GET /api/pipeline/status` every 5 seconds and displays:

```
┌──────────────────────────────────────────────────────────────────┐
│  PIPELINE STATUS                 Last updated: 14:32 UTC         │
│                                                                  │
│  [NFS]──►[NeMo Curator]──►[Chunking+Embed]──►[Milvus]           │
│  3 files    ✓ Complete        ✓ Complete      ✓ Ready            │
│                                                                  │
│  PII Curation Report                                             │
│  Entities found: 12    Entities masked: 12 (100%)               │
│  EMAIL: 6   PHONE: 3   LOCATION: 3                               │
│                                                                  │
│  Milvus Collections                                              │
│  customer_records   3 vectors                                    │
│  return_policy      1 vectors                                    │
│  rma_exceptions     1 vectors                                    │
│                                                                  │
│  NIM Health                                                      │
│  ● qwen   ● embed   ● asr   ● tts                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Observability

| Dashboard | URL | What it shows |
|-----------|-----|---------------|
| Grafana | `https://spark.local/grafana` | GPU utilization, NIM throughput/latency, Milvus insert rate |
| Ray Dashboard | `https://spark.local/ray` | Curator + ingest job DAG, per-task logs, resource utilization |
| Pipeline Monitor | `https://csagent.local/` (Pipeline tab) | Business-friendly pipeline status for demo audiences |

Grafana credentials: `admin` / `admin`

---

## Known Issues and Notes

| Issue | Note |
|-------|------|
| Kokoro TTS on CPU | SM 12.1 (GB10 Blackwell) not yet in standard PyTorch CUDA wheels. TTS works but is slower (~2-3s for a typical response). |
| No order_id in customer data | Source data has no order column. `create_rma_ticket` generates `ACCT-{account_id}` as order reference. |
| 3 demo customers | Small dataset — sufficient for demo. Add rows to `customer_orders.xlsx` and re-run the pipeline to expand. |
| NIM warmup | Qwen NIM takes ~2 min to reach readiness after pod start. Wait for `curl .../v1/health/ready` to return 200 before testing. |
| TTS voice | Kokoro voice `af_heart` (American English, natural female). Change `TTS_VOICE` env var in `k8s/08-nim-tts.yaml` or pass `voice` in the TTS request body. |
