"use client";

import { Wrench } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  lookup_customer: "Customer Lookup",
  check_return_policy: "Return Policy",
  check_rma_exceptions: "RMA Exceptions",
  create_rma_ticket: "Create RMA",
};

interface Props {
  name: string;
  args: Record<string, unknown>;
}

export default function ToolCallBadge({ name, args }: Props) {
  const label = TOOL_LABELS[name] ?? name;
  const firstArg = Object.values(args)[0];
  const hint = typeof firstArg === "string" ? firstArg : undefined;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-surface-border text-xs text-text-secondary"
      title={JSON.stringify(args, null, 2)}
    >
      <Wrench size={10} className="text-brand" />
      {label}
      {hint && (
        <span className="text-text-muted truncate max-w-[120px]">({hint})</span>
      )}
      <span className="text-brand">✓</span>
    </span>
  );
}
