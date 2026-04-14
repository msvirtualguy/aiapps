# Hermes Agent — Kubernetes Demo

A production-grade Kubernetes deployment of [Nous Research Hermes Agent](https://hermes-agent.nousresearch.com/) backed by **Nutanix Enterprise AI (NAI)** as the inference engine and **Nutanix Files CSI** for persistent memory storage. Users interact via **Telegram Bot**.

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
│  │                          ▼ (on first boot only)              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Container: hermes                                   │   │  │
│  │  │  nousresearch/hermes-agent:latest                    │   │  │
│  │  │                                                      │   │  │
│  │  │  hermes gateway run                                  │   │  │
│  │  │                                                      │   │  │
│  │  │  MCP Servers (stdio subprocesses):                   │   │  │
│  │  │  ├─ mcp-server-time      (uvx)                       │   │  │
│  │  │  ├─ mcp-server-fetch     (uvx)                       │   │  │
│  │  │  ├─ server-filesystem    (npx)                       │   │  │
│  │  │  └─ mcp-server-kubernetes (npx)                      │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                    │                      │                         │
│          HTTPS /v1/                  PVC Mount                      │
│         chat/completions          /opt/data                         │
│                    │                      │                         │
│  ┌─────────────────┴──┐    ┌──────────────┴──────────────────────┐ │
│  │  NAI Inference     │    │  PersistentVolumeClaim: hermes-data  │ │
│  │  Endpoint          │    │  StorageClass: nai-nfs-storage       │ │
│  │  Gemma 4           │    │  50Gi  ReadWriteMany                 │ │
│  │  192.168.160.0/24  │    │  Nutanix Files CSI                   │ │
│  └────────────────────┘    └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Networking & Security

```
┌─────────────────────────────────────────────────────────────────────┐
│  NetworkPolicy: hermes-network-policy                               │
│                                                                     │
│  Ingress  ──────────────────────────────────────────  DENY ALL      │
│                                                                     │
│  Egress   ──────────────────────────────────────────  DENY DEFAULT  │
│                                                                     │
│  Egress ALLOWED:                                                    │
│                                                                     │
│  ┌────────────────┐   port 53    ┌──────────────────────────────┐  │
│  │  hermes pod    │ ──────────▶  │  kube-dns                    │  │
│  └────────────────┘              └──────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┐  :443 HTTPS  ┌──────────────────────────────┐  │
│  │  hermes pod    │ ──────────▶  │  NAI Endpoint                │  │
│  └────────────────┘              │  192.168.160.0/24            │  │
│                                  └──────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┐  :443 HTTPS  ┌──────────────────────────────┐  │
│  │  hermes pod    │ ──────────▶  │  Telegram Bot API            │  │
│  └────────────────┘              │  149.154.160.0/20            │  │
│                                  │  91.108.4.0/22               │  │
│                                  └──────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┐  :443/:80    ┌──────────────────────────────┐  │
│  │  hermes pod    │ ──────────▶  │  Public internet             │  │
│  └────────────────┘              │  (MCP package downloads)     │  │
│                   except RFC-1918 │  excl. 10/8, 172.16/12,     │  │
│                                  │  192.168/16                  │  │
│                                  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Memory & Storage Layout

```
Nutanix Files CSI PVC: hermes-data  (50Gi, ReadWriteMany)
Mounted at: /opt/data inside the container

/opt/data/
├── config.yaml          ← seeded from ConfigMap on first boot
├── .env                 ← seeded from .env.example on first boot
├── memories/            ← persistent agent memory (FTS5 SQLite + summaries)
├── skills/              ← 78 bundled skills + any self-generated skills
├── sessions/            ← full session transcripts
├── logs/                ← agent run logs
├── cron/                ← scheduled automation tasks
├── plans/               ← agent-generated plans
└── workspace/           ← MCP filesystem tool working directory
                            (readable/writable by the agent)
```

---

### Dynamic Tool System (MCP)

Hermes spawns MCP servers as **stdio subprocesses** inside the container. The Hermes image ships with `uvx` (Python) and `npx` (Node), so no extra images are needed.

```
hermes process
     │
     ├── stdio ──▶  uvx mcp-server-time          (clock / timezone queries)
     │
     ├── stdio ──▶  uvx mcp-server-fetch          (web page retrieval)
     │
     ├── stdio ──▶  npx @modelcontextprotocol/    (read/write /opt/data/workspace)
     │               server-filesystem
     │
     └── stdio ──▶  npx mcp-server-kubernetes     (K8s cluster operations)
```

**Adding a tool without rebuilding the image:**

1. Add an entry to `mcp_servers` in `k8s/configmap.yaml`
2. Delete the existing config from the PVC so the init container re-seeds it:
   ```bash
   kubectl exec -n hermes-agent deploy/hermes -- rm /opt/data/config.yaml
   ```
3. Re-deploy:
   ```bash
   bash deploy.sh
   ```

---

### Kubernetes Resources

| Resource | Name | Purpose |
|---|---|---|
| `Namespace` | `hermes-agent` | Isolated scope for all resources |
| `Secret` | `hermes-secrets` | NAI API key, NAI URL, model name, Telegram credentials |
| `ConfigMap` | `hermes-config` | Hermes `cli-config.yaml` (model, memory, MCP servers, gateway) |
| `PersistentVolumeClaim` | `hermes-data` | 50Gi Nutanix Files NFS volume for persistent agent state |
| `Deployment` | `hermes` | Single replica, rolling update, init container for config seeding |
| `Service` | `hermes` | ClusterIP (debug / future web UI access) |
| `NetworkPolicy` | `hermes-network-policy` | Egress-scoped to NAI + Telegram IPs; deny all ingress |
| `PodDisruptionBudget` | `hermes-pdb` | `minAvailable: 1` — protects against drain eviction |

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
| `OPENAI_BASE_URL` | NAI base URL — e.g. `https://192.168.160.202/enterpriseai/v1` |
| `NAI_MODEL` | Model name as registered in NAI console — e.g. `gemma-4-e4b-it` |
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ALLOWED_USERS` | Comma-separated Telegram user IDs — find yours via [@userinfobot](https://t.me/userinfobot) |

> `config/.env.template` is gitignored and never committed. `config/.env.example` (placeholder values only) is the committed reference.

---

## Deploy

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

# Interactive Hermes CLI (same memory/skills as the Telegram bot)
kubectl exec -it -n hermes-agent deploy/hermes -- hermes

# Force config re-seed after ConfigMap change
kubectl exec -n hermes-agent deploy/hermes -- rm /opt/data/config.yaml
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
├── deploy.sh                      # Render + apply hermes-all.yaml from .env.template
├── config/
│   ├── .env.example               # Placeholder reference — safe to commit
│   ├── .env.template              # Real credentials — gitignored, never commit
│   └── cli-config.yaml.template   # Hermes config source of truth
└── k8s/
    ├── hermes-all.yaml            # Consolidated manifest (envsubst template)
    ├── namespace.yaml
    ├── secret.yaml                # Template with placeholder values
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
- **NetworkPolicy** restricts egress to NAI subnet, Telegram API IPs, and DNS only. All other egress (including other cluster namespaces) is denied.
- **Container runs as UID 10000** (`runAsUser: 10000`) — matches the `hermes` user baked into the image, bypasses the entrypoint's root→hermes privilege drop, and avoids NFS `root_squash` permission errors.
- **PodDisruptionBudget** ensures the agent is never evicted without a replacement, preserving Telegram polling continuity.

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
| Config changes not picked up | Init container skips existing `config.yaml` | `kubectl exec ... -- rm /opt/data/config.yaml` then rollout restart |
