"use client";

import { useEffect, useState } from "react";
import type { PipelineStatus } from "@/lib/types";
import { CheckCircle, XCircle, Loader, ArrowRight } from "lucide-react";

const STAGE_LABELS = ["NFS Source", "NeMo Curator", "NV-Ingest", "Embed NIM", "Milvus"];

function NimDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: "bg-green-400",
    not_ready: "bg-yellow-400",
    unreachable: "bg-red-400",
    unknown: "bg-surface-border",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-surface-border"}`}
      title={status}
    />
  );
}

function StageNode({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center border text-xs font-medium transition-colors ${
          complete
            ? "bg-brand/20 border-brand/50 text-brand"
            : "bg-surface border-surface-border text-text-muted"
        }`}
      >
        {complete ? <CheckCircle size={16} /> : <Loader size={16} className="animate-spin" />}
      </div>
      <span className="text-[10px] text-text-muted text-center w-16 leading-tight">{label}</span>
    </div>
  );
}

export default function PipelineMonitor() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const resp = await fetch("/api/pipeline/status");
      if (resp.ok) {
        setStatus(await resp.json());
        setLastFetch(new Date());
      }
    } catch {
      // keep last known status
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const stagesComplete = status
    ? [
        true, // NFS source always present
        status.curation.complete,
        status.ingestion.complete,
        status.nims.embed === "ready",
        status.ingestion.complete && Object.keys(status.ingestion.collections).length > 0,
      ]
    : Array(5).fill(false);

  const report = status?.curation.report;
  const collections = status?.ingestion.collections ?? {};
  const nims = status?.nims ?? {};

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Pipeline Status</h2>
        {lastFetch && (
          <span className="text-xs text-text-muted">
            Last updated: {lastFetch.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Pipeline flow diagram */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STAGE_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <StageNode label={label} complete={stagesComplete[i]} />
              {i < STAGE_LABELS.length - 1 && (
                <ArrowRight
                  size={14}
                  className={stagesComplete[i] ? "text-brand" : "text-surface-border"}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PII Curation report */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">PII Curation Report</h3>
        {report ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Entities Found" value={report.total_entities_found} />
              <Stat label="Entities Masked" value={report.total_entities_masked} />
              <Stat
                label="Masking Rate"
                value={`${(report.masking_rate * 100).toFixed(0)}%`}
                highlight
              />
            </div>
            <div className="border-t border-surface-border pt-3">
              <p className="text-xs text-text-muted mb-2">Entity breakdown:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.entity_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="text-xs px-2 py-0.5 rounded-full bg-surface border border-surface-border text-text-secondary"
                    >
                      {type}: {count}
                    </span>
                  ))}
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Generated: {new Date(report.generated_at).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            No curation report yet. Run the pipeline to curate data.
          </p>
        )}
      </div>

      {/* Milvus collections */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Milvus Vector Collections</h3>
        {Object.keys(collections).length > 0 ? (
          <div className="space-y-2">
            {["customer_records", "return_policy", "rma_exceptions"].map((name) => (
              <div key={name} className="flex items-center justify-between py-1.5 border-b border-surface-border last:border-0">
                <span className="text-sm text-text-secondary font-mono">{name}</span>
                <span className="text-sm text-brand font-semibold">
                  {(collections[name] ?? 0).toLocaleString()} vectors
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No collections found. Run the pipeline first.</p>
        )}
      </div>

      {/* NIM health */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">NIM Model Endpoints</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "qwen", label: "Qwen3-32B (LLM)" },
            { key: "embed", label: "nv-embedqa (Embeddings)" },
            { key: "asr", label: "Parakeet (ASR)" },
            { key: "tts", label: "Personaplex (TTS)" },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center gap-2 bg-surface border border-surface-border rounded-lg px-3 py-2"
            >
              <NimDot status={nims[key] ?? "unknown"} />
              <div>
                <p className="text-xs font-medium text-text-primary">{label}</p>
                <p className="text-[10px] text-text-muted capitalize">{nims[key] ?? "unknown"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-brand" : "text-text-primary"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
