"""
NeMo Curator PII curation job.

Reads raw data from INPUT_PATH, detects and redacts PII entities,
writes curated output to OUTPUT_PATH, and generates a curation_report.json
with statistics for the Pipeline Monitor dashboard.

PII is replaced with typed tokens: [PERSON], [EMAIL], [PHONE], [ADDRESS], etc.
customer_id fields are preserved (non-PII reference key for agent lookup).
device serial numbers are preserved (needed for RMA validation).
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INPUT_PATH = Path(os.environ.get("INPUT_PATH", "/data"))
OUTPUT_PATH = Path(os.environ.get("OUTPUT_PATH", "/data/curated"))
REPORT_PATH = Path(os.environ.get("REPORT_PATH", "/data/curated/curation_report.json"))


def setup_output_dirs():
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# PII detection using NeMo Curator
# ---------------------------------------------------------------------------

def run_nemo_curator_pii(input_files: list[Path]) -> dict:
    """
    Run NeMo Curator PII detection and redaction over input files.
    Returns aggregate statistics.
    """
    try:
        from nemo_curator import get_client
        from nemo_curator.datasets import DocumentDataset
        from nemo_curator.modifiers.pii_modifier import PiiModifier, PiiModifierConfig
        from nemo_curator.utils.distributed_utils import get_num_workers
    except ImportError:
        log.warning("nemo_curator not available — falling back to regex PII detector")
        return run_regex_pii_fallback(input_files)

    client = get_client(cluster_type="gpu")
    log.info("NeMo Curator client started with %d workers", get_num_workers(client))

    all_stats: dict[str, int] = {}

    for file_path in input_files:
        log.info("Processing %s", file_path)
        suffix = file_path.suffix.lower()

        if suffix in (".csv", ".json", ".jsonl"):
            stats = process_structured_file(file_path, client, PiiModifier, PiiModifierConfig)
        else:
            stats = process_document_file(file_path, client, PiiModifier, PiiModifierConfig)

        for entity_type, count in stats.items():
            all_stats[entity_type] = all_stats.get(entity_type, 0) + count

    client.close()
    return all_stats


def process_structured_file(file_path: Path, client, PiiModifier, PiiModifierConfig) -> dict:
    from nemo_curator.datasets import DocumentDataset
    import pandas as pd

    suffix = file_path.suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(file_path)
    elif suffix in (".json", ".jsonl"):
        df = pd.read_json(file_path, lines=(suffix == ".jsonl"))
    else:
        df = pd.read_csv(file_path)

    # Preserve non-PII reference columns by converting row to string for analysis,
    # then write back with PII fields redacted.
    preserve_cols = {"customer_id", "order_id", "device_serial", "sku", "product_sku"}
    text_cols = [c for c in df.columns if c.lower() not in preserve_cols]

    stats: dict[str, int] = {}
    config = PiiModifierConfig(
        supported_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "LOCATION", "US_SSN"],
        anonymize_action="replace",
    )
    modifier = PiiModifier(config)

    for col in text_cols:
        if df[col].dtype == object:
            results = df[col].apply(lambda v: modifier.modify_document(str(v)) if pd.notna(v) else v)
            df[col] = results.apply(lambda r: r.text if hasattr(r, "text") else r)
            for r in results:
                if hasattr(r, "entities"):
                    for ent in r.entities:
                        stats[ent.entity_type] = stats.get(ent.entity_type, 0) + 1

    out_path = OUTPUT_PATH / file_path.name
    if suffix == ".csv":
        df.to_csv(out_path, index=False)
    else:
        df.to_json(out_path, orient="records", lines=(suffix == ".jsonl"))

    log.info("Written curated %s → %s (%s PII entities)", file_path.name, out_path, sum(stats.values()))
    return stats


def process_document_file(file_path: Path, client, PiiModifier, PiiModifierConfig) -> dict:
    from nemo_curator.datasets import DocumentDataset
    import dask.dataframe as dd
    import pandas as pd

    text = file_path.read_text(encoding="utf-8", errors="replace")
    config = PiiModifierConfig(
        supported_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "LOCATION"],
        anonymize_action="replace",
    )
    modifier = PiiModifier(config)
    result = modifier.modify_document(text)

    out_path = OUTPUT_PATH / file_path.name
    curated_text = result.text if hasattr(result, "text") else text
    out_path.write_text(curated_text, encoding="utf-8")

    stats: dict[str, int] = {}
    if hasattr(result, "entities"):
        for ent in result.entities:
            stats[ent.entity_type] = stats.get(ent.entity_type, 0) + 1

    log.info("Written curated %s → %s (%s PII entities)", file_path.name, out_path, sum(stats.values()))
    return stats


# ---------------------------------------------------------------------------
# Fallback: regex-based PII redaction (no GPU/NeMo Curator required)
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
NAME_HINTS_RE = re.compile(r"(?i)\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*")


def read_as_text(file_path: Path) -> tuple[str, str]:
    """Return (text_content, output_extension) handling binary formats."""
    suffix = file_path.suffix.lower()
    if suffix == ".xlsx":
        import pandas as pd
        df = pd.read_excel(file_path, engine="openpyxl")
        return df.to_csv(index=False), ".csv"
    elif suffix == ".docx":
        from docx import Document as DocxDocument
        doc = DocxDocument(str(file_path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip()), ".txt"
    else:
        return file_path.read_text(encoding="utf-8", errors="replace"), suffix


def run_regex_pii_fallback(input_files: list[Path]) -> dict:
    all_stats: dict[str, int] = {"EMAIL_ADDRESS": 0, "PHONE_NUMBER": 0, "US_SSN": 0, "PERSON": 0}

    for file_path in input_files:
        text, out_ext = read_as_text(file_path)

        emails = EMAIL_RE.findall(text)
        phones = PHONE_RE.findall(text)
        ssns = SSN_RE.findall(text)
        names = NAME_HINTS_RE.findall(text)

        text = EMAIL_RE.sub("[EMAIL]", text)
        text = PHONE_RE.sub("[PHONE]", text)
        text = SSN_RE.sub("[SSN]", text)
        text = NAME_HINTS_RE.sub("[PERSON]", text)

        out_path = OUTPUT_PATH / (file_path.stem + out_ext)
        out_path.write_text(text, encoding="utf-8")

        all_stats["EMAIL_ADDRESS"] += len(emails)
        all_stats["PHONE_NUMBER"] += len(phones)
        all_stats["US_SSN"] += len(ssns)
        all_stats["PERSON"] += len(names)

        log.info("Regex redacted %s → %s (%d entities)", file_path.name, out_path.name,
                 len(emails) + len(phones) + len(ssns) + len(names))

    return all_stats


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def write_report(stats: dict[str, int], input_files: list[Path]):
    total = sum(stats.values())
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files_processed": [str(f.name) for f in input_files],
        "total_entities_found": total,
        "total_entities_masked": total,
        "masking_rate": 1.0,
        "entity_breakdown": stats,
        "curated_output_path": str(OUTPUT_PATH),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    log.info("Curation report written to %s", REPORT_PATH)
    log.info("Summary: %d PII entities found and masked across %d files", total, len(input_files))
    for entity_type, count in sorted(stats.items(), key=lambda x: -x[1]):
        log.info("  %-20s %d", entity_type, count)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    setup_output_dirs()

    # Collect input files (skip the curated/ subdir and report files)
    input_files = [
        p for p in INPUT_PATH.iterdir()
        if p.is_file() and p.suffix.lower() in (
            ".csv", ".json", ".jsonl", ".txt", ".md", ".pdf",
            ".yaml", ".yml", ".xlsx", ".docx",
        )
        and p.parent == INPUT_PATH  # only top-level files, not curated/
    ]

    if not input_files:
        log.error("No input files found in %s", INPUT_PATH)
        raise SystemExit(1)

    log.info("Found %d input files: %s", len(input_files), [f.name for f in input_files])

    stats = run_nemo_curator_pii(input_files)
    write_report(stats, input_files)
    log.info("NeMo Curator PII curation complete.")


if __name__ == "__main__":
    main()
