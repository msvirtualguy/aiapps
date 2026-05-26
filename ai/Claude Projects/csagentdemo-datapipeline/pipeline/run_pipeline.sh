#!/usr/bin/env bash
# Orchestrates the full data pipeline in two stages:
#   Stage 1: NeMo Curator PII curation
#   Stage 2: NV-Ingest vectorization → Milvus
#
# Usage: bash pipeline/run_pipeline.sh
set -euo pipefail

NAMESPACE=cs-pipeline
CURATOR_JOB=nemo-curator-job
INGEST_JOB=nv-ingest-job
TIMEOUT=30m

echo "==> Stage 1: NeMo Curator PII curation"
# Delete previous job if exists (jobs are not rerunnable otherwise)
kubectl delete job ${CURATOR_JOB} -n ${NAMESPACE} --ignore-not-found

kubectl apply -f k8s/11-curator-job.yaml
echo "    Waiting up to ${TIMEOUT} for curator job to complete..."
kubectl wait --for=condition=complete job/${CURATOR_JOB} \
  -n ${NAMESPACE} --timeout=${TIMEOUT}

echo "    Curator complete. Checking output..."
kubectl run check-curator --rm -it --restart=Never \
  --image=busybox:latest \
  --overrides="{
    \"spec\": {
      \"volumes\": [{\"name\":\"data\",\"persistentVolumeClaim\":{\"claimName\":\"cs-source-data\"}}],
      \"containers\": [{
        \"name\":\"check\",
        \"image\":\"busybox\",
        \"command\":[\"ls\",\"-la\",\"/data/curated/\"],
        \"volumeMounts\":[{\"name\":\"data\",\"mountPath\":\"/data\"}]
      }]
    }
  }" \
  -n ${NAMESPACE}

echo ""
echo "==> Stage 2: NV-Ingest vectorization"
kubectl delete job ${INGEST_JOB} -n ${NAMESPACE} --ignore-not-found
kubectl apply -f k8s/12-nv-ingest-job.yaml
echo "    Waiting up to ${TIMEOUT} for NV-Ingest job to complete..."
kubectl wait --for=condition=complete job/${INGEST_JOB} \
  -n ${NAMESPACE} --timeout=${TIMEOUT}

echo ""
echo "==> Verifying Milvus collections..."
python3 pipeline/verify_milvus.py

echo ""
echo "==> Pipeline complete. Data is ready for the agent."
