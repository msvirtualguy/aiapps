"use client";

import type { Message } from "@/lib/types";

interface Props {
  message: Message;
}

export default function UserMessage({ message }: Props) {
  return (
    <div className="flex gap-3 max-w-3xl ml-auto flex-row-reverse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-border flex items-center justify-center text-xs font-bold text-text-secondary">
        U
      </div>
      <div className="bg-brand/10 border border-brand/30 rounded-xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-text-primary max-w-lg">
        {message.content}
      </div>
    </div>
  );
}
