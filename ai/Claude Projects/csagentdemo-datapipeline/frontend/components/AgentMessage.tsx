"use client";

import type { Message } from "@/lib/types";
import ToolCallBadge from "./ToolCallBadge";
import RMACard from "./RMACard";

interface Props {
  message: Message;
}

export default function AgentMessage({ message }: Props) {
  const { content, toolCalls, rmaTicket, streaming } = message;

  // Strip JSON ticket blob from displayed text (shown as RMACard instead)
  const displayText = content.replace(/\{[\s\S]*"rma_number"[\s\S]*\}/, "").trim();

  return (
    <div className="flex gap-3 max-w-3xl">
      {/* Agent avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-black">
        E
      </div>

      <div className="flex-1 space-y-2">
        {/* Tool call badges */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} args={tc.args} />
            ))}
          </div>
        )}

        {/* Message text */}
        <div className="bg-surface-raised border border-surface-border rounded-xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-text-primary">
          {displayText || (streaming ? "" : "(no response)")}
          {streaming && <span className="streaming-cursor" />}
        </div>

        {/* RMA ticket card */}
        {rmaTicket && <RMACard ticket={rmaTicket} />}
      </div>
    </div>
  );
}
