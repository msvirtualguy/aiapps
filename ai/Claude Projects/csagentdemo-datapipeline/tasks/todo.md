# Implementation Checklist

## Phase 0 — k3s Foundation
- [ ] Install Helm CLI on DGX Spark node
- [ ] `make foundation` — installs nfs-csi, cert-manager, ingress-nginx, kuberay, prometheus-stack
- [ ] Verify GPU time-slicing: `kubectl describe node | grep nvidia.com/gpu`

## Phase 1 — Namespaces & Secrets
- [ ] `kubectl apply -f k8s/00-namespaces.yaml`
- [ ] Set NGC_API_KEY in config/.env
- [ ] `kubectl apply -f k8s/02-ngc-secret.yaml`

## Phase 2 — NIM Inference Stack
- [ ] `make nims`
- [ ] Verify embedding NIM ready: `curl -sk https://spark.local/nim/embed/v1/health/ready`
- [ ] Verify qwen NIM ready: `curl -sk https://spark.local/nim/qwen/v1/health/ready`
- [ ] Verify asr NIM ready: `curl -sk https://spark.local/nim/asr/v1/health/ready`
- [ ] Verify tts NIM ready: `curl -sk https://spark.local/nim/tts/v1/health/ready`

## Phase 3 — Data Infrastructure
- [ ] `make data`
- [ ] Verify Milvus pod running: `kubectl get pods -n cs-pipeline`

## Phase 4 — Data Pipeline
- [ ] Place raw data files on NFS at 192.168.110.200:/volume1/k3s/data
- [ ] `make pipeline`
- [ ] Review curation_report.json on NFS (/volume1/k3s/data/curated/)
- [ ] Verify Milvus collections populated: `python pipeline/verify_milvus.py`

## Phase 5 — Application
- [ ] `make app`
- [ ] Test text chat: open https://csagent.local
- [ ] Test voice: click mic, speak, verify Personaplex voice response
- [ ] Open Pipeline Monitor tab, verify PII report displays

## Verification
- [ ] `make verify` — all NIM endpoints return 200
- [ ] Full RMA scenario: type defective NIC return request → RMACard appears
- [ ] Voice E2E: speak request → voice response plays

## Review
<!-- Add notes after implementation -->
