"""
Post-pipeline verification script.
Checks that Milvus collections exist and have expected record counts.
Run locally with: python pipeline/verify_milvus.py
Or inline via kubectl (see Makefile pipeline target).
"""

import os
import sys

MILVUS_HOST = os.environ.get("MILVUS_HOST", "localhost")
MILVUS_PORT = int(os.environ.get("MILVUS_PORT", "19530"))
EXPECTED_COLLECTIONS = ["customer_records", "return_policy", "rma_exceptions"]
MIN_RECORDS_PER_COLLECTION = 1

try:
    from pymilvus import connections, Collection, utility
except ImportError:
    print("pymilvus not installed. Run: pip install pymilvus")
    sys.exit(1)


def main():
    print(f"Connecting to Milvus at {MILVUS_HOST}:{MILVUS_PORT}...")
    try:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT, timeout=10)
    except Exception as e:
        print(f"FAIL: Cannot connect to Milvus — {e}")
        sys.exit(1)

    print("Connected.\n")
    all_ok = True

    for name in EXPECTED_COLLECTIONS:
        if not utility.has_collection(name):
            print(f"  MISSING  {name}")
            all_ok = False
            continue

        col = Collection(name)
        col.load()
        count = col.num_entities
        status = "OK" if count >= MIN_RECORDS_PER_COLLECTION else "EMPTY"
        if status == "EMPTY":
            all_ok = False
        print(f"  {status:8s} {name:<25} {count:>6} vectors")

    print()
    if all_ok:
        print("All collections verified. Pipeline is ready.")
        sys.exit(0)
    else:
        print("Verification FAILED — re-run pipeline or check logs.")
        sys.exit(1)


if __name__ == "__main__":
    main()
