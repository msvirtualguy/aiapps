"use client";

import type { RMATicket } from "@/lib/types";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Props {
  ticket: RMATicket;
}

const DECISION_STYLES = {
  Approved: {
    icon: CheckCircle,
    color: "text-green-400",
    border: "border-green-400/30",
    bg: "bg-green-400/5",
    badge: "bg-green-400/20 text-green-300",
  },
  Denied: {
    icon: XCircle,
    color: "text-red-400",
    border: "border-red-400/30",
    bg: "bg-red-400/5",
    badge: "bg-red-400/20 text-red-300",
  },
  Escalated: {
    icon: AlertCircle,
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/5",
    badge: "bg-yellow-400/20 text-yellow-300",
  },
};

export default function RMACard({ ticket }: Props) {
  const style = DECISION_STYLES[ticket.decision] ?? DECISION_STYLES.Escalated;
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className={style.color} />
          <span className="font-semibold text-text-primary">RMA {ticket.decision}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
          {ticket.rma_number}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Detail label="Customer" value={ticket.customer_id} />
        <Detail label="Order" value={ticket.order_id} />
        <Detail label="SKU" value={ticket.product_sku} />
        <Detail label="Created" value={ticket.created_at} />
        <div className="col-span-2">
          <Detail label="Defect" value={ticket.defect_description} />
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t border-surface-border pt-3 text-xs text-text-secondary leading-relaxed">
        {ticket.instructions}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-text-muted">{label}: </span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
