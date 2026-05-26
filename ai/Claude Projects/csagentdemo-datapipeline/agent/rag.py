"""
RAG layer: direct pymilvus + httpx.
Queries our custom Milvus schema directly — no LlamaIndex dependency.
Collections use fields: id, text, source_file, chunk_index, embedding
(customer_records also has: customer_id, order_id)
"""

import os

import httpx
from pymilvus import Collection, connections

EMBED_BASE_URL = os.environ["EMBED_BASE_URL"]
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nvidia/llama-3.2-nv-embedqa-1b-v2")
MILVUS_HOST = os.environ["MILVUS_HOST"]
MILVUS_PORT = int(os.environ.get("MILVUS_PORT", "19530"))

_milvus_connected = False


def _connect():
    global _milvus_connected
    if not _milvus_connected:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        _milvus_connected = True


def _embed(text: str) -> list[float]:
    resp = httpx.post(
        f"{EMBED_BASE_URL}/embeddings",
        json={"input": [text], "model": EMBED_MODEL},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def retrieve(collection_name: str, query: str, top_k: int = 5) -> list[str]:
    """Embed query and vector-search the collection. Returns matching text chunks."""
    _connect()
    query_vector = _embed(query)
    col = Collection(collection_name)
    col.load()
    results = col.search(
        data=[query_vector],
        anns_field="embedding",
        param={"metric_type": "COSINE", "params": {"ef": 64}},
        limit=top_k,
        output_fields=["text"],
    )
    return [
        hit.entity.get("text", "")
        for hits in results
        for hit in hits
        if hit.entity.get("text")
    ]


def retrieve_customer(customer_id: str) -> str | None:
    """Exact-match retrieval by customer_id metadata filter."""
    _connect()
    try:
        col = Collection("customer_records")
        col.load()
        results = col.query(
            expr=f'customer_id == "{customer_id}"',
            output_fields=["text", "customer_id", "order_id"],
            limit=10,
        )
        if results:
            return "\n".join(r["text"] for r in results)
    except Exception:
        pass
    return None
