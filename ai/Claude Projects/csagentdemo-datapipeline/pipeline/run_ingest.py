"""
NV-Ingest vectorization pipeline.

Reads curated documents from /data/curated/, chunks them, embeds via
the nv-embedqa NIM, and writes vectors + metadata to Milvus collections.

Collections created:
  - customer_records  (customer PII-masked data + order history)
  - return_policy     (return policy document chunks)
  - rma_exceptions    (RMA exception rules chunks)
"""

import json
import logging
import os
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

CURATED_PATH = Path(os.environ.get("INPUT_PATH", "/data/curated"))
EMBED_BASE_URL = os.environ["EMBED_BASE_URL"]
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nvidia/llama-3.2-nv-embedqa-1b-v2")
MILVUS_HOST = os.environ["MILVUS_HOST"]
MILVUS_PORT = int(os.environ.get("MILVUS_PORT", "19530"))
EMBED_DIM = 2048  # llama-3.2-nv-embedqa-1b-v2

COLLECTION_PATTERNS = {
    "customer_records": ["customer_orders", "customer_data", "customers"],
    "return_policy": ["return_policy", "returns", "policy"],
    "rma_exceptions": ["rma_exceptions", "rma_exception", "exceptions", "rma_rules"],
}

CHUNK_SIZES = {
    "customer_records": 512,
    "return_policy": 768,
    "rma_exceptions": 512,
}
CHUNK_OVERLAP = 64
RESET_COLLECTIONS = os.environ.get("RESET_COLLECTIONS", "false").lower() == "true"


# ---------------------------------------------------------------------------
# Milvus setup
# ---------------------------------------------------------------------------

def get_milvus():
    from pymilvus import connections, Collection, CollectionSchema, FieldSchema, DataType, utility
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    return connections, Collection, CollectionSchema, FieldSchema, DataType, utility


def ensure_collection(collection_name: str, dim: int):
    from pymilvus import Collection, CollectionSchema, FieldSchema, DataType, utility

    if utility.has_collection(collection_name):
        if RESET_COLLECTIONS:
            log.info("RESET_COLLECTIONS=true — dropping %s", collection_name)
            utility.drop_collection(collection_name)
        else:
            log.info("Collection %s already exists — will append", collection_name)
            return Collection(collection_name)

    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=4096),
        FieldSchema(name="source_file", dtype=DataType.VARCHAR, max_length=256),
        FieldSchema(name="chunk_index", dtype=DataType.INT64),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim),
    ]

    # customer_records gets extra metadata fields for exact lookup
    if collection_name == "customer_records":
        fields.extend([
            FieldSchema(name="customer_id", dtype=DataType.VARCHAR, max_length=64),
            FieldSchema(name="order_id", dtype=DataType.VARCHAR, max_length=64),
        ])

    schema = CollectionSchema(fields, description=f"CS Agent demo — {collection_name}")
    col = Collection(collection_name, schema)

    col.create_index("embedding", {
        "metric_type": "COSINE",
        "index_type": "HNSW",
        "params": {"M": 16, "efConstruction": 200},
    })
    col.load()
    log.info("Created collection %s", collection_name)
    return col


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def embed_texts(texts: list[str]) -> list[list[float]]:
    import httpx

    url = f"{EMBED_BASE_URL}/embeddings"
    payload = {"input": texts, "model": EMBED_MODEL}
    resp = httpx.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return [item["embedding"] for item in data["data"]]


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


# ---------------------------------------------------------------------------
# File routing
# ---------------------------------------------------------------------------

def route_file(file_path: Path) -> str | None:
    name_lower = file_path.stem.lower()
    for collection, patterns in COLLECTION_PATTERNS.items():
        if any(p in name_lower for p in patterns):
            return collection
    return None


def read_file_text(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix in (".json", ".jsonl"):
        import json
        try:
            data = json.loads(file_path.read_text())
            if isinstance(data, list):
                return "\n".join(json.dumps(row) for row in data)
            return json.dumps(data, indent=2)
        except Exception:
            return file_path.read_text()
    elif suffix == ".xlsx":
        import pandas as pd
        df = pd.read_excel(file_path, engine="openpyxl")
        return df.to_csv(index=False)
    elif suffix == ".docx":
        from docx import Document as DocxDocument
        doc = DocxDocument(str(file_path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    elif suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(file_path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif suffix == ".csv":
        return file_path.read_text()
    else:
        return file_path.read_text(encoding="utf-8", errors="replace")


def _find_col(col_map: dict, *patterns: str) -> str | None:
    """Return the original column name whose normalized key matches any pattern."""
    for pat in patterns:
        for key, orig in col_map.items():
            if pat in key:
                return orig
    return None


def ingest_customer_records(file_path: Path, collection) -> int:
    """Per-row ingestion for customer_records: one vector per customer row."""
    import pandas as pd

    suffix = file_path.suffix.lower()
    if suffix == ".xlsx":
        df = pd.read_excel(file_path, engine="openpyxl")
    elif suffix == ".csv":
        df = pd.read_csv(file_path)
    else:
        log.warning("ingest_customer_records: unexpected extension %s — falling back to text chunking", suffix)
        return ingest_file(file_path, "customer_records", collection)

    # Normalize column names for pattern matching
    col_map = {c.lower().replace(" ", "_").replace("-", "_"): c for c in df.columns}

    cid_col = _find_col(col_map, "account_member_id", "customer_id", "member_id", "account_id")
    oid_col = _find_col(col_map, "order_id", "order_number", "order_num", "orderid")

    log.info("Customer file %s — customer_id col: %s, order_id col: %s", file_path.name, cid_col, oid_col)
    log.info("Columns: %s", list(df.columns))

    texts: list[str] = []
    customer_ids: list[str] = []
    order_ids: list[str] = []

    for _, row in df.iterrows():
        parts = [f"{col}: {row[col]}" for col in df.columns if pd.notna(row[col]) and str(row[col]).strip()]
        text = " | ".join(parts)[:4096]
        texts.append(text)
        customer_ids.append(str(row[cid_col]).strip() if cid_col and pd.notna(row[cid_col]) else "")
        order_ids.append(str(row[oid_col]).strip() if oid_col and pd.notna(row[oid_col]) else "")

    batch_size = 32
    total = 0
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        embeddings = embed_texts(batch_texts)
        rows = {
            "text": batch_texts,
            "source_file": [file_path.name] * len(batch_texts),
            "chunk_index": list(range(i, i + len(batch_texts))),
            "embedding": embeddings,
            "customer_id": customer_ids[i:i + batch_size],
            "order_id": order_ids[i:i + batch_size],
        }
        collection.insert([rows[f.name] for f in collection.schema.fields
                           if f.name != "id" and f.name in rows])
        total += len(batch_texts)

    collection.flush()
    log.info("Inserted %d customer records from %s", total, file_path.name)
    return total


# ---------------------------------------------------------------------------
# Main ingest loop
# ---------------------------------------------------------------------------

def ingest_file(file_path: Path, collection_name: str, collection):
    text = read_file_text(file_path)
    chunk_size = CHUNK_SIZES.get(collection_name, 512)
    chunks = chunk_text(text, chunk_size, CHUNK_OVERLAP)

    log.info("Embedding %d chunks from %s → %s", len(chunks), file_path.name, collection_name)

    batch_size = 32
    total_inserted = 0
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        embeddings = embed_texts(batch)

        rows: dict = {
            "text": batch,
            "source_file": [file_path.name] * len(batch),
            "chunk_index": list(range(i, i + len(batch))),
            "embedding": embeddings,
        }

        if collection_name == "customer_records":
            customer_ids = []
            order_ids = []
            for chunk in batch:
                cid, oid = extract_customer_metadata(chunk)
                customer_ids.append(cid)
                order_ids.append(oid)
            rows["customer_id"] = customer_ids
            rows["order_id"] = order_ids

        collection.insert([rows[f.name] for f in collection.schema.fields
                           if f.name != "id" and f.name in rows])
        total_inserted += len(batch)

    collection.flush()
    log.info("Inserted %d vectors for %s", total_inserted, file_path.name)
    return total_inserted


def main():
    from pymilvus import connections
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    log.info("Connected to Milvus at %s:%d", MILVUS_HOST, MILVUS_PORT)

    input_files = [
        p for p in CURATED_PATH.iterdir()
        if p.is_file() and p.suffix.lower() in (".csv", ".json", ".jsonl", ".txt", ".md", ".pdf", ".yaml", ".yml", ".xlsx", ".docx")
        and p.name != "curation_report.json"
    ]

    if not input_files:
        log.error("No curated files found in %s — run curator_job.py first", CURATED_PATH)
        raise SystemExit(1)

    collections_cache = {}
    summary = {}

    for file_path in input_files:
        collection_name = route_file(file_path)
        if collection_name is None:
            log.warning("No collection mapping for %s — skipping", file_path.name)
            continue

        if collection_name not in collections_cache:
            collections_cache[collection_name] = ensure_collection(collection_name, EMBED_DIM)

        if collection_name == "customer_records" and file_path.suffix.lower() in (".csv", ".xlsx"):
            count = ingest_customer_records(file_path, collections_cache[collection_name])
        else:
            count = ingest_file(file_path, collection_name, collections_cache[collection_name])
        summary[collection_name] = summary.get(collection_name, 0) + count

    log.info("NV-Ingest complete. Collection sizes:")
    for name, count in summary.items():
        log.info("  %-25s %d vectors", name, count)


if __name__ == "__main__":
    main()
