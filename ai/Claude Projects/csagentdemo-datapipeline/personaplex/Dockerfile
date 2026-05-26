FROM nvidia/cuda:12.6.0-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# Install torch first with the ARM64 CUDA 12.6 index, then remaining deps
RUN pip3 install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu126 && \
    pip3 install --no-cache-dir -r requirements.txt

COPY server.py .

ENV HF_HOME=/opt/personaplex/cache
ENV TRANSFORMERS_CACHE=/opt/personaplex/cache

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
