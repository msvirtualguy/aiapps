# Hermes Agent — Kubernetes Demo

A production-grade Kubernetes deployment of [Nous Research Hermes Agent](https://hermes-agent.nousresearch.com/) backed by **Nutanix Enterprise AI (NAI)** as the inference engine and **Nutanix Files CSI** for persistent memory storage. Users interact via **Telegram Bot**. Web search is provided by **Firecrawl**, proxied through the **NAI MCP Connector**.

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interaction                             │
│                                                                     │
│                       📱 Telegram Client                            │
│                              │                                      │
│                    HTTPS (outbound polling)                         │
│                              │                                      │
│                   🌐 Telegram Bot API                               │
│                    api.telegram.org                                 │
│                              │                                      │
│                    HTTPS (outbound polling)                         │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│  Kubernetes Cluster          │                                      │
│  Namespace: hermes-agent     ▼                                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Deployment: hermes                                          │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Init Container: config-writer                       │   │  │
│  │  │  Seeds cli-config.yaml from ConfigMap → PVC          │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                          │                                   │  │
│  │                          ▼                                   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Container: hermes                                   │   │  │
│  │  │  nousresearch/hermes-agent:latest                    │   │  │
│  │  │                                                      │   │  │
│  │  │  hermes gateway run                                  │   │  │
│  │  │                                                      │   │  │
│  │  │  MCP Servers (stdio subprocesses):                   │   │  │
│  │  │  ├─ mcp-server-time      (uvx)                       │   │  │
│  │  │  ├─ server-filesystem    (npx)                       │   │  │
│  │  │  └─ firecrawl            (NAI MCP Connector → HTTP)  │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                    │              │              │                   │
│          HTTPS /v1/          PVC Mount     MCP over HTTPS           │
│         chat/completions   /opt/data      (NAI Connector)           │
│                    │              │              │                   │
│  ┌─────────────────┴──┐  ┌───────┴──────┐  ┌───┴──────────────┐   │
│  │  NAI Inference     │  │  PVC:         │  │  NAI MCP         │   │
│  │  Endpoint          │  │  hermes-data  │  │  Connector       │   │
│  │  neo-hermes        │  │  50Gi RWX     │  │  Envoy Gateway   │   │
│  └────────────────────┘  └──────────────┘  └───────┬──────────┘   │
│                                                     │               │
│                                              ┌──────┴───────────┐   │
│                                              │  Deployment:      │   │
│                                              │  mcp-firecrawl   │   │
│                                              │                   │   │
│                                              │  FastMCP server  │   │
│                                              │  + nginx TLS     │   │
│                                              │  (port 443)      │   │
│                                              └──────────────────┘   │
│                                                     │               │
└─────────────────────────────────────────────────────┼───────────────┘
                                                      │ HTTPS
                                               api.firecrawl.dev
```

---

### MCP Tool Chain (Firecrawl)

```
Hermes pod
  │
  │  MCP over HTTPS
  ▼
NAI MCP Connector endpoint
  https://synthient.matrix.local/enterpriseai/mcp/hermes-mcp-firecrl
  Auth: NAI_MCP_KEY (Bearer token)
  │
  │  Envoy Gateway (nai-ingress-gateway, 172.16.3.152)
  │  MCPRoute: hermes-mcp-firecrl  →  Backend: firecrawl
  │  BackendTLSPolicy: verifies root-ca.local CA
  │
  ▼
mcp-firecrawl pod  (hermes-agent namespace)
  nginx TLS sidecar  :443  →  FastMCP  :8000/mcp
  │
  │  HTTPS (outbound)
  ▼
api.firecrawl.dev

Tool name as seen by Hermes: firecrawl__search
(Backend resource name + "__" + tool name — must be human-readable
 for small/4B models to reliably invoke the tool)
```

---

### Networking & Security

```
┌─────────────────────────────────────────────────────────────────────┐
│  NetworkPolicy: hermes-network-policy                               │
│                                                                     │
│  Ingress  ──────────────────────────────────────────  DENY ALL      │
│                                                                     │
│  Egress (unrestricted — cluster SSL inspection proxy routes         │
│  outbound traffic through unpredictable CIDRs; ingress deny-all     │
│  still eliminates inbound attack surface)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Memory & Storage Layout

```
Nutanix Files CSI PVC: hermes-data  (50Gi, ReadWriteMany)
Mounted at: /opt/data inside the container

/opt/data/
├── config.yaml          ← always overwritten from ConfigMap on pod start
├── .env                 ← seeded from .env.example on first boot
├── memories/            ← persistent agent memory (FTS5 SQLite + summaries)
├── skills/              ← 78 bundled skills + any self-generated skills
├── sessions/            ← full session transcripts
├── logs/                ← agent run logs
├── cron/                ← scheduled automation tasks
├── plans/               ← agent-generated plans
└── workspace/           ← MCP filesystem tool working directory
```

---

### Dynamic Tool System (MCP)

Hermes spawns MCP servers as **stdio subprocesses** inside the container, or connects outbound to HTTP MCP servers. The Firecrawl tool is accessed via the NAI MCP Connector (Envoy Gateway proxy).

```
hermes process
     │
     ├── stdio ──▶  uvx mcp-server-time          (clock / timezone queries)
     │
     ├── stdio ──▶  npx @modelcontextprotocol/    (read/write /opt/data/workspace)
     │               server-filesystem
     │
     └── HTTPS MCP ──▶  NAI MCP Connector  ──▶  mcp-firecrawl pod
                         hermes-mcp-firecrl        FastMCP + nginx TLS
                         (Envoy Gateway)            (web search via Firecrawl API)
```

**Adding a tool without rebuilding the image:**

1. Add an entry to `mcp_servers` in `k8s/hermes-all.yaml` (and `k8s/configmap.yaml`)
2. Re-deploy: `bash deploy.sh`

---

### Kubernetes Resources

| Resource | Name | Namespace | Purpose |
|---|---|---|---|
| `Namespace` | `hermes-agent` | — | Isolated scope for all resources |
| `Secret` | `hermes-secrets` | `hermes-agent` | NAI API key, NAI URL, model name, Telegram credentials, Firecrawl API key, NAI MCP key |
| `ConfigMap` | `hermes-config` | `hermes-agent` | Hermes `cli-config.yaml` (model, memory, MCP servers, gateway) |
| `ConfigMap` | `nai-ca-cert` | `hermes-agent` | root-ca.local CA cert for Python SSL trust (Hermes → NAI) |
| `ConfigMap` | `hermes-ssl-patch` | `hermes-agent` | Python `sitecustomize.py` — disables cert verification as fallback |
| `PersistentVolumeClaim` | `hermes-data` | `hermes-agent` | 50Gi Nutanix Files NFS volume for persistent agent state |
| `Deployment` | `hermes` | `hermes-agent` | Single replica, Recreate strategy, init container for config seeding |
| `Deployment` | `mcp-firecrawl` | `hermes-agent` | FastMCP server + nginx TLS sidecar — exposes Firecrawl tools |
| `Service` | `hermes` | `hermes-agent` | ClusterIP (debug / future web UI) |
| `Service` | `mcp-firecrawl` | `hermes-agent` | ClusterIP :443 — Envoy routes to this |
| `NetworkPolicy` | `hermes-network-policy` | `hermes-agent` | Deny all ingress to hermes pod |
| `PodDisruptionBudget` | `hermes-pdb` | `hermes-agent` | `minAvailable: 1` — protects against drain eviction |
| `ConfigMap` | `mcp-firecrawl-ca` | `nai-admin` | root-ca.local CA cert for Envoy TLS verification (Envoy → mcp-firecrawl) |
| `Backend` | `firecrawl` | `nai-admin` | Envoy Backend pointing to mcp-firecrawl — name becomes tool prefix |
| `BackendTLSPolicy` | `firecrawl` | `nai-admin` | Configures Envoy to trust root-ca.local when connecting to mcp-firecrawl |
| `MCPRoute` | `hermes-mcp-firecrl` | `nai-admin` | NAI-managed route — patched to use `firecrawl` Backend (not UUID backend) |

---

## Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| `kubectl` | Apply manifests, inspect pods | `winget install Kubernetes.kubectl` |
| `envsubst` | Render `${VAR}` placeholders in manifests | `winget install GnuWin32.GetText` |
| Kubeconfig | Access to the K8s cluster | Download from Rancher UI → cluster → **Download KubeConfig** |

---

## Configuration

### 1. Clone and set up credentials

```bash
git clone https://github.com/msvirtualguy/aiapps.git
cd "aiapps/ai/Claude Projects/Hermes Agent Demo"

cp config/.env.example config/.env.template
# Edit config/.env.template and fill in real values
```

### 2. `config/.env.template` reference

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | NAI inference endpoint API key |
| `OPENAI_BASE_URL` | NAI base URL — e.g. `https://synthient.matrix.local/enterpriseai/v1` |
| `NAI_MODEL` | Model name as registered in NAI console — e.g. `neo-hermes` |
| `NAI_MCP_KEY` | NAI MCP Connector access key — from NAI console → Tools → MCP Connectors → Access Key |
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ALLOWED_USERS` | Comma-separated Telegram user IDs — find yours via [@userinfobot](https://t.me/userinfobot) |
| `FIRECRAWL_API_KEY` | Firecrawl API key — from [firecrawl.dev/app/api-keys](https://firecrawl.dev/app/api-keys) |

### Context Window Note

Hermes Agent enforces a minimum context window of **64,000 tokens**. The config sets `context_length: 65536` as an override to satisfy this check. The actual usable context is bounded by whatever `max_model_len` is configured in the NAI model deployment — not this value.

> `config/.env.template` is gitignored and never committed. `config/.env.example` (placeholder values only) is the committed reference.

---

## Deploy

### Step 1 — NAI Admin Resources (one-time)

These resources live in `nai-admin` (Envoy Gateway / NAI control plane namespace) and must be applied before Hermes can reach mcp-firecrawl via the connector:

```bash
kubectl apply -f k8s/nai-admin-resources.yaml
```

### Step 2 — Firecrawl MCP Pod

```bash
kubectl apply -f k8s/mcp-firecrawl.yaml
```

### Step 3 — Create NAI MCP Connector (NAI Console)

In the NAI console → **Tools → MCP Connectors**:
- Name: `hermes-mcp-firecrl`
- Backend URL: `https://mcp-firecrawl.hermes-agent.svc.cluster.local/mcp`
- Select tools to expose: `search`

This auto-generates an MCPRoute and a UUID-named Backend in `nai-admin`.

### Step 4 — Patch MCPRoute to Use Friendly Backend Name

NAI auto-names the Backend with a UUID prefix, which causes tool names like `nai-<uuid>__search`. Small models (4B params) cannot reliably invoke tools with UUID names. Patch the MCPRoute to use the friendly `firecrawl` Backend instead:

```bash
kubectl patch mcproute hermes-mcp-firecrl -n nai-admin --type=json -p '[
  {"op": "replace", "path": "/spec/backendRefs/0/name", "value": "firecrawl"}
]'
```

After this patch, Hermes sees the tool as `firecrawl__search`.

### Step 5 — Deploy Hermes

```bash
bash deploy.sh
```

Preview the rendered manifest without applying:

```bash
bash deploy.sh --dry-run
```

Use a specific kubeconfig:

```bash
KUBECONFIG=/path/to/kubeconfig bash deploy.sh
```

---

## Day-2 Operations

```bash
# Watch pod status
kubectl get pods -n hermes-agent -w

# Stream logs
kubectl logs -n hermes-agent deploy/hermes -f

# Stream mcp-firecrawl logs
kubectl logs -n hermes-agent deploy/mcp-firecrawl -c mcp-firecrawl -f

# Interactive Hermes CLI (same memory/skills as the Telegram bot)
kubectl exec -it -n hermes-agent deploy/hermes -- /opt/hermes/.venv/bin/hermes

# List tools Hermes has loaded (shows firecrawl__search when connector is healthy)
kubectl exec -it -n hermes-agent deploy/hermes -- /opt/hermes/.venv/bin/hermes tools

# Force config re-seed after ConfigMap change (init container always overwrites)
kubectl rollout restart deployment/hermes -n hermes-agent

# Restart without config change
kubectl rollout restart deployment/hermes -n hermes-agent

# Rotate a secret value
kubectl patch secret hermes-secrets -n hermes-agent \
  --type=json \
  -p='[{"op":"replace","path":"/data/OPENAI_API_KEY","value":"'$(echo -n "<new-key>" | base64)'"}]'
kubectl rollout restart deployment/hermes -n hermes-agent
```

---

## File Structure

```
Hermes Agent Demo/
├── deploy.sh                        # Render + apply hermes-all.yaml from .env.template
├── config/
│   ├── .env.example                 # Placeholder reference — safe to commit
│   ├── .env.template                # Real credentials — gitignored, never commit
│   └── cli-config.yaml.template     # Hermes config source of truth
└── k8s/
    ├── hermes-all.yaml              # Consolidated manifest (envsubst template)
    ├── mcp-firecrawl.yaml           # Firecrawl MCP pod (FastMCP + nginx TLS sidecar)
    ├── nai-admin-resources.yaml     # NAI/Envoy resources: Backend, BackendTLSPolicy, CA ConfigMap
    ├── namespace.yaml
    ├── secret.yaml                  # Template with placeholder values
    ├── configmap.yaml
    ├── pvc.yaml
    ├── deployment.yaml
    ├── service.yaml
    ├── networkpolicy.yaml
    └── poddisruptionbudget.yaml
```

---

## Security Notes

- **Credentials** live only in `config/.env.template` (gitignored) and the K8s Secret object. They are never embedded in committed files.
- **NetworkPolicy** denies all ingress to the hermes pod. Egress is unrestricted (cluster SSL inspection proxy routes outbound traffic through unpredictable CIDRs, making destination-scoped rules impractical).
- **Container runs as UID 10000** (`runAsUser: 10000`) — matches the `hermes` user baked into the image, bypasses the entrypoint's root→hermes privilege drop, and avoids NFS `root_squash` permission errors.
- **PodDisruptionBudget** ensures the agent is never evicted without a replacement, preserving Telegram polling continuity.
- **Recreate strategy** (not RollingUpdate) prevents two Hermes pods running simultaneously — two pods = two Telegram pollers = duplicate responses and race conditions.
- **SSL patch** (`hermes-ssl-patch` ConfigMap) disables Python cert verification via `sitecustomize.py`. Root cause: cluster SSL inspection proxy re-signs all TLS using an internal CA. Proper fix: obtain root-ca.local from Nutanix Prism (Settings → SSL Certificate) and mount as trusted CA.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ImagePullBackOff` | Wrong registry or tag | Image is on Docker Hub as `nousresearch/hermes-agent:latest` |
| `chown: Operation not permitted` | NFS `root_squash` blocks root chown | `runAsUser: 10000` in pod spec bypasses this |
| `executable file not found in $PATH` | `command:` overrides Docker ENTRYPOINT | Use `args:` instead of `command:` for the main container |
| `Unknown provider 'openai'` | Invalid Hermes provider string | Use `provider: "custom"` for OpenAI-compatible endpoints |
| `invalid choice: 'telegram'` | Wrong gateway subcommand | Use `hermes gateway run` — platform selected by config, not arg |
| `dial tcp 127.0.0.1:8080` | No kubeconfig loaded | Download from Rancher UI → set `KUBECONFIG` env var |
| Config changes not picked up | Init container always overwrites `config.yaml` | `kubectl rollout restart deployment/hermes -n hermes-agent` |
| `SSL: CERTIFICATE_VERIFY_FAILED` on Telegram or NAI | Cluster SSL inspection proxy re-signs all TLS with internal CA | `sitecustomize.py` disables cert verification at Python startup |
| `context window of X below minimum 64,000` | Hermes enforces a 64K minimum guard | Set `context_length: 65536` in config to bypass the check |
| Firecrawl tool shows as `nai-<uuid>__search` | NAI auto-generates UUID-named Backend | Patch MCPRoute: `kubectl patch mcproute hermes-mcp-firecrl -n nai-admin --type=json -p '[{"op":"replace","path":"/spec/backendRefs/0/name","value":"firecrawl"}]'` |
| Firecrawl tool returns 500 / session error | Envoy can't verify mcp-firecrawl TLS cert | Apply `k8s/nai-admin-resources.yaml` — creates BackendTLSPolicy with root-ca.local |
| Agent claims no web search despite tool being visible | 4B model anchored on prior failures in session | Start a fresh Telegram conversation; explicitly say "use firecrawl search tool to search for X" |
| `TypeError: Object of type SearchData is not JSON serializable` | firecrawl-py>=1.0.0 returns Pydantic models | Fixed in `mcp-firecrawl.yaml` via `_dump()` helper using `.model_dump()` |
| `FirecrawlClient.search() got unexpected keyword argument 'params'` | firecrawl-py>=1.0.0 API change | Fixed in `mcp-firecrawl.yaml` — use `fc.search(query, limit=limit)` |
