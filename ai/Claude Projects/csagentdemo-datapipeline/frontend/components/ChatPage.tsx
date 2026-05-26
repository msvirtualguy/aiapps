"use client";

import { useState } from "react";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import PipelineMonitor from "./PipelineMonitor";
import type { Message, ToolCall, RMATicket } from "@/lib/types";
import { streamChat } from "@/lib/stream";

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function extractRMATicket(text: string): RMATicket | undefined {
  try {
    const match = text.match(/\{[\s\S]*"rma_number"[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // not a valid JSON ticket in the text
  }
  return undefined;
}

export default function ChatPage() {
  const [tab, setTab] = useState<"chat" | "pipeline">("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hello! I'm Emerson, your ASI customer service agent. I can help with product returns and RMA requests. How can I assist you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      content: text,
    };

    const assistantId = nanoid();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      toolCalls: [],
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let fullText = "";

    await streamChat(history, {
      onDelta: (chunk) => {
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullText } : m,
          ),
        );
      },
      onToolCall: (tc: ToolCall) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, toolCalls: [...(m.toolCalls ?? []), tc] }
              : m,
          ),
        );
      },
      onDone: () => {
        const ticket = extractRMATicket(fullText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, rmaTicket: ticket }
              : m,
          ),
        );
        setIsLoading(false);
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, streaming: false }
              : m,
          ),
        );
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-border bg-surface-raised">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span className="font-semibold text-text-primary tracking-wide">
            ASI Customer Service
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
          Live
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-surface-border bg-surface-raised">
        {(["chat", "pipeline"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "text-brand border-b-2 border-brand"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t === "chat" ? "Chat" : "Pipeline Monitor"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "chat" ? (
          <div className="flex flex-col h-full">
            <ChatWindow messages={messages} />
            <MessageInput onSend={sendMessage} disabled={isLoading} />
          </div>
        ) : (
          <PipelineMonitor />
        )}
      </div>
    </div>
  );
}
