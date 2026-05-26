import type { ToolCall } from "./types";

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onToolCall: (tc: ToolCall) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks,
) {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    callbacks.onError(new Error(`Chat request failed: ${resp.status}`));
    return;
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function processBuffer() {
    // Handle both \r\n\r\n and \n\n as event separators
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split(/\r?\n/);
      let eventType = "delta";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }

      if (!data && eventType !== "done") continue;

      if (eventType === "delta") {
        callbacks.onDelta(data);
      } else if (eventType === "tool_call") {
        try {
          callbacks.onToolCall(JSON.parse(data));
        } catch {
          // ignore malformed tool call
        }
      } else if (eventType === "done") {
        callbacks.onDone();
        return true; // signal done
      }
    }
    return false;
  }

  while (true) {
    const { done, value } = await reader.read();

    if (value?.length) {
      buffer += decoder.decode(value, { stream: !done });
      if (processBuffer()) return;
    }

    if (done) break;
  }

  // Process any remaining buffer content
  if (buffer.trim()) {
    processBuffer();
  }

  callbacks.onDone();
}
