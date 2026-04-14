#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — render hermes-all.yaml from .env.template and apply to cluster
#
# Usage:
#   bash deploy.sh              # apply (create or update)
#   bash deploy.sh --dry-run    # preview rendered YAML without applying
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="$(dirname "$0")/config/.env.template"
MANIFEST="$(dirname "$0")/k8s/hermes-all.yaml"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy config/.env.example to config/.env.template and fill in your values."
  exit 1
fi

# Load env vars from .env.template (skip comment lines and blanks)
set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +a

# Verify required vars are set and not placeholders
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

if [ "${1:-}" = "--dry-run" ]; then
  echo "=== Rendered manifest (dry run — not applied) ==="
  envsubst < "$MANIFEST"
  exit 0
fi

echo "Deploying Hermes Agent to cluster..."
envsubst < "$MANIFEST" | kubectl apply -f -
echo ""
echo "Done. Check pod status with:"
echo "  kubectl get pods -n hermes-agent"
echo "  kubectl logs -n hermes-agent deploy/hermes -f"
