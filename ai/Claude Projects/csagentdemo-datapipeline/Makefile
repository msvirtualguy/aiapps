SHELL := /bin/bash
ENV_FILE := config/.env

# Load env vars from config/.env if it exists
ifneq (,$(wildcard $(ENV_FILE)))
  include $(ENV_FILE)
  export
endif

# SSH target for remote builds on DGX Spark (images must be built where k3s containerd runs)
SPARK_USER ?= msheehy
SPARK_SSH := ssh $(SPARK_USER)@$(DGX_SPARK_IP)
SPARK_RSYNC := rsync -az --delete --mkpath -e ssh
SPARK_BUILD_DIR := /tmp/csagent-build

.PHONY: help foundation nims tts-build pipeline app all clean

help:
	@echo "Purrfect Emerson — CS Agent Demo"
	@echo ""
	@echo "Targets (run in order for fresh deployment):"
	@echo "  foundation  Install Helm charts + apply k3s tooling (run once)"
	@echo "  nims        Deploy NIM inference containers + expose endpoints"
	@echo "  data        Deploy Milvus + configure NFS storage"
	@echo "  pipeline    Run NeMo Curator PII curation + NV-Ingest vectorization"
	@echo "  app         Build and deploy agent backend + frontend"
	@echo "  all         Run all phases in order"
	@echo ""
	@echo "Utilities:"
	@echo "  personaplex-build  Build Personaplex TTS image (nvidia/personaplex-7b-v1 from HF)"
	@echo "  verify             Run end-to-end verification checks"
	@echo "  clean              Delete all cs-* namespaces (destructive)"
	@echo ""
	@echo "Required in config/.env: NGC_API_KEY, DGX_SPARK_IP"
	@echo "Optional in config/.env: HF_TOKEN (if personaplex model is gated)"

foundation:
	@echo "==> Phase 0: Installing k3s tooling via Helm..."
	helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
	helm repo add jetstack https://charts.jetstack.io
	helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
	helm repo add kuberay https://ray-project.github.io/kuberay-helm/
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
	helm repo update
	helm upgrade --install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
	  --namespace kube-system --wait
	helm upgrade --install cert-manager jetstack/cert-manager \
	  --namespace cert-manager --create-namespace \
	  --set installCRDs=true --wait
	helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
	  --namespace ingress-nginx --create-namespace --wait
	helm upgrade --install kuberay-operator kuberay/kuberay-operator \
	  --namespace kuberay-system --create-namespace --wait
	helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
	  --namespace monitoring --create-namespace \
	  --set grafana.adminPassword=admin \
	  --set grafana.ingress.enabled=true \
	  --set grafana.ingress.ingressClassName=nginx \
	  --set grafana.ingress.hosts[0]=spark.local \
	  --set grafana.ingress.paths[0]=/grafana \
	  --set grafana.grafana\\.ini.server.root_url="https://spark.local/grafana" \
	  --set grafana.grafana\\.ini.server.serve_from_sub_path=true \
	  --wait
	@echo "==> Applying GPU time-slicing and namespaces..."
	kubectl apply -f k8s/00-namespaces.yaml
	kubectl apply -f k8s/01-gpu-timeslicing.yaml
	kubectl patch clusterpolicy cluster-policy \
	  --type merge \
	  -p '{"spec":{"devicePlugin":{"config":{"name":"time-slicing-config","default":"any"}}}}' \
	  --namespace gpu-operator || true
	@echo "==> Foundation complete."

tts-build:
	@echo "==> Building Kokoro TTS image on DGX Spark ($(DGX_SPARK_IP))..."
	@test -n "$(DGX_SPARK_IP)" || (echo "ERROR: DGX_SPARK_IP not set in config/.env" && exit 1)
	$(SPARK_SSH) "mkdir -p $(SPARK_BUILD_DIR)/tts"
	$(SPARK_RSYNC) tts/ $(SPARK_USER)@$(DGX_SPARK_IP):$(SPARK_BUILD_DIR)/tts/
	$(SPARK_SSH) "cd $(SPARK_BUILD_DIR)/tts && \
	  docker build --platform linux/arm64 -t kokoro-tts:latest . && \
	  docker save kokoro-tts:latest | sudo k3s ctr images import -"
	@echo "==> Kokoro TTS image built and imported into k3s containerd."

nims: tts-build
	@echo "==> Phase 2: Deploying NIM inference stack..."
	@test -n "$(NGC_API_KEY)" || (echo "ERROR: NGC_API_KEY not set in config/.env" && exit 1)
	@echo "Applying NGC pull secret and NIM registry config..."
	kubectl create secret docker-registry ngc-registry \
	  --docker-server=nvcr.io \
	  --docker-username='$$oauthtoken' \
	  --docker-password="$(NGC_API_KEY)" \
	  -n cs-inference --dry-run=client -o yaml | kubectl apply -f -
	kubectl create secret docker-registry ngc-registry \
	  --docker-server=nvcr.io \
	  --docker-username='$$oauthtoken' \
	  --docker-password="$(NGC_API_KEY)" \
	  -n cs-pipeline --dry-run=client -o yaml | kubectl apply -f -
	kubectl create secret generic ngc-api-key \
	  --from-literal=NGC_API_KEY="$(NGC_API_KEY)" \
	  -n cs-inference --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -f k8s/10-nim-registry-configmap.yaml
	@echo "Deploying embedding NIM first (pipeline depends on it)..."
	kubectl apply -f k8s/05-nim-embedding.yaml
	kubectl rollout status deployment/embedding-nim -n cs-inference --timeout=10m
	@echo "Deploying remaining NIMs..."
	kubectl apply -f k8s/06-nim-qwen.yaml
	kubectl apply -f k8s/07-nim-asr.yaml
	@echo "Deploying Riva TTS NIM..."
	kubectl apply -f k8s/08-nim-tts.yaml
	kubectl apply -f k8s/09-nim-ingress.yaml
	@echo "==> NIMs deployed. Endpoints available at https://spark.local/nim/{qwen,embed,asr,tts}"


data:
	@echo "==> Phase 3: Deploying data infrastructure..."
	kubectl apply -f k8s/03-nfs-pv-pvc.yaml
	helm repo add milvus https://zilliztech.github.io/milvus-helm/
	helm repo update
	helm upgrade --install milvus milvus/milvus \
	  --namespace cs-pipeline \
	  -f k8s/04-milvus-values.yaml \
	  --wait
	@echo "==> Milvus ready at milvus.cs-pipeline.svc.cluster.local:19530"

pipeline:
	@echo "==> Phase 4: Running data pipeline (curation + ingestion)..."
	kubectl apply -f k8s/11-ray-cluster.yaml
	@echo "Waiting for RayCluster head to be ready..."
	kubectl wait --for=condition=ready pod -l ray.io/node-type=head \
	  -n cs-pipeline --timeout=5m
	@echo "Creating pipeline ConfigMaps from local scripts..."
	kubectl create configmap curator-script \
	  --from-file=curator_job.py=pipeline/curator_job.py \
	  -n cs-pipeline --dry-run=client -o yaml | kubectl apply -f -
	kubectl create configmap ingest-script \
	  --from-file=run_ingest.py=pipeline/run_ingest.py \
	  -n cs-pipeline --dry-run=client -o yaml | kubectl apply -f -
	kubectl create configmap ingest-config \
	  --from-file=ingest_config.yaml=pipeline/ingest_config.yaml \
	  -n cs-pipeline --dry-run=client -o yaml | kubectl apply -f -
	@echo "Running NeMo Curator PII curation job..."
	kubectl delete job nemo-curator-job -n cs-pipeline --ignore-not-found
	kubectl apply -f k8s/11-curator-job.yaml
	kubectl wait --for=condition=complete job/nemo-curator-job \
	  -n cs-pipeline --timeout=30m
	@echo "Curator complete. Running NV-Ingest vectorization..."
	kubectl delete job nv-ingest-job -n cs-pipeline --ignore-not-found
	kubectl apply -f k8s/12-nv-ingest-job.yaml
	kubectl wait --for=condition=complete job/nv-ingest-job \
	  -n cs-pipeline --timeout=30m
	@echo "Verifying Milvus collections..."
	pip install pymilvus -q && \
	  MILVUS_HOST=localhost MILVUS_PORT=19530 python3 pipeline/verify_milvus.py || \
	  echo "(Run verify_milvus.py from inside the cluster for accurate results)"
	@echo "==> Pipeline complete."

app:
	@echo "==> Phase 5: Building and deploying agent backend on DGX Spark ($(DGX_SPARK_IP))..."
	@test -n "$(DGX_SPARK_IP)" || (echo "ERROR: DGX_SPARK_IP not set in config/.env" && exit 1)
	$(SPARK_SSH) "mkdir -p $(SPARK_BUILD_DIR)/agent $(SPARK_BUILD_DIR)/frontend"
	$(SPARK_RSYNC) agent/ $(SPARK_USER)@$(DGX_SPARK_IP):$(SPARK_BUILD_DIR)/agent/
	$(SPARK_SSH) "cd $(SPARK_BUILD_DIR)/agent && \
	  docker build --platform linux/arm64 -t cs-agent-backend:latest . && \
	  docker save cs-agent-backend:latest | sudo k3s ctr images import -"
	kubectl apply -f k8s/13-agent-backend.yaml
	kubectl rollout status deployment/cs-agent-backend -n cs-agent --timeout=5m
	@echo "==> Building and deploying frontend on DGX Spark ($(DGX_SPARK_IP))..."
	$(SPARK_RSYNC) frontend/ $(SPARK_USER)@$(DGX_SPARK_IP):$(SPARK_BUILD_DIR)/frontend/
	$(SPARK_SSH) "cd $(SPARK_BUILD_DIR)/frontend && \
	  docker build --platform linux/arm64 -t cs-agent-frontend:latest . && \
	  docker save cs-agent-frontend:latest | sudo k3s ctr images import -"
	kubectl apply -f k8s/14-frontend.yaml
	kubectl rollout status deployment/cs-agent-frontend -n cs-agent --timeout=5m
	kubectl apply -f k8s/15-app-ingress.yaml
	@echo "==> App deployed. Access at https://csagent.local"

all: foundation nims data pipeline app
	@echo "==> Full deployment complete!"
	@echo "    CS Agent UI:  https://csagent.local"
	@echo "    NIM APIs:     https://spark.local/nim/{qwen,embed,asr,tts}"
	@echo "    Ray Dashboard: https://spark.local/ray"
	@echo "    Grafana:       https://spark.local/grafana (admin/admin)"

verify:
	@echo "==> Running verification checks..."
	@bash -c 'for nim in qwen embed asr tts; do \
	  echo -n "NIM $$nim: "; \
	  curl -sk https://spark.local/nim/$$nim/v1/health/ready -o /dev/null -w "%{http_code}\n" || echo "FAIL"; \
	done'
	@echo "Checking agent health..."
	@curl -sk https://csagent.local/api/health | python3 -m json.tool
	@echo "==> Verification done."

clean:
	@echo "WARNING: This will delete all cs-* namespaces. Press Ctrl+C to cancel."
	@sleep 5
	kubectl delete namespace cs-inference cs-pipeline cs-agent --ignore-not-found
	helm uninstall milvus -n cs-pipeline --ignore-not-found || true
