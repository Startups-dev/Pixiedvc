"use client";

import { useEffect, useRef } from "react";

import PixieMessage from "@/components/pixie/PixieMessage";
import type { PixieClientMessage } from "@/lib/pixie/client/types";

export default function PixieMessageList({
  messages,
  currentAssistantText,
}: {
  messages: PixieClientMessage[];
  currentAssistantText: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, currentAssistantText]);

  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {messages.map((message) => (
          <PixieMessage key={message.id} message={message} />
        ))}
        {currentAssistantText ? (
          <PixieMessage
            message={{
              id: "pixie_current_assistant",
              role: "assistant",
              content: currentAssistantText,
              createdAt: new Date().toISOString(),
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

