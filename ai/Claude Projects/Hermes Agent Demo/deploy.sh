#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — render hermes-all.yaml from .env.template and apply to cluster
#
# Usage:
#   bash deploy.sh                                    # apply using ~/.kube/config
#   bash deploy.sh --dry-run                          # preview rendered YAML only
#   KUBECONFIG=/path/to/kubeconfig bash deploy.sh     # use a specific kubeconfig
#
# Getting your kubeconfig from Rancher:
#   Rancher UI → select cluster → Download KubeConfig → save to ~/.kube/config
#   Or set KUBECONFIG env var to point to the downloaded file.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/config/.env.template"
MANIFEST="$SCRIPT_DIR/k8s/hermes-all.yaml"

# ── Check prerequisites ───────────────────────────────────────────────────────
if ! command -v kubectl &>/dev/null; then
  echo "ERROR: kubectl not found in PATH."
  echo "Install: https://kubernetes.io/docs/tasks/tools/"
  exit 1
fi

if ! command -v envsubst &>/dev/null; then
  echo "ERROR: envsubst not found. Install gettext:"
  echo "  Windows (winget): winget install GnuWin32.GetText"
  echo "  Windows (choco):  choco install gettext"
  exit 1
fi

# ── Validate kubeconfig / cluster connectivity ────────────────────────────────
if [ -n "${KUBECONFIG:-}" ]; then
  echo "Using kubeconfig: $KUBECONFIG"
elif [ -f "$HOME/.kube/config" ]; then
  echo "Using kubeconfig: $HOME/.kube/config"
else
  echo "ERROR: No kubeconfig found."
  echo ""
  echo "Download from Rancher:"
  echo "  1. Open Rancher UI"
  echo "  2. Select your cluster → Download KubeConfig (top right)"
  echo "  3. Save to ~/.kube/config  (or set KUBECONFIG=/path/to/file)"
  exit 1
fi

echo "Checking cluster connectivity..."
if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: Cannot reach the cluster."
  echo "Current context: $(kubectl config current-context 2>/dev/null || echo 'none')"
  echo ""
  echo "Verify the kubeconfig is correct and the cluster API is reachable."
  exit 1
fi
echo "Connected: $(kubectl config current-context)"

# ── Load and validate env vars ────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "ERROR: $ENV_FILE not found."
  echo "Run: cp config/.env.example config/.env.template"
  echo "Then fill in your NAI and Telegram credentials."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +a

REQUIRED_VARS=(OPENAI_API_KEY OPENAI_BASE_URL NAI_MODEL TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_USERS)
MISSING=0
for VAR in "${REQUIRED_VARS[@]}"; do
  VAL="${!VAR:-}"
  if [ -z "$VAL" ] || [[ "$VAL" == REPLACE* ]]; then
    echo "ERROR: $VAR is not set or still contains a placeholder value."
    MISSING=1
  fi
done
[ "$MISSING" -eq 1 ] && exit 1

# ── Dry run ───────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--dry-run" ]; then
  echo ""
  echo "=== Rendered manifest (dry run — not applied) ==="
  envsubst < "$MANIFEST"
  exit 0
fi

# ── Deploy ────────────────────────────────────────────────────────────────────
echo ""
echo "Deploying Hermes Agent..."
envsubst < "$MANIFEST" | kubectl apply -f -

echo ""
echo "Done. Monitor the rollout:"
echo "  kubectl get pods -n hermes-agent -w"
echo "  kubectl logs -n hermes-agent deploy/hermes -f"
