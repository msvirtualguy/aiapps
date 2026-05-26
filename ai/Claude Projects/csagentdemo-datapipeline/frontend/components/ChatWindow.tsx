"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import AgentMessage from "./AgentMessage";
import UserMessage from "./UserMessage";

interface Props {
  messages: Message[];
}

export default function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) =>
        msg.role === "assistant" ? (
          <AgentMessage key={msg.id} message={msg} />
        ) : (
          <UserMessage key={msg.id} message={msg} />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
