"use client";

import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";
import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieChatEvent, PixieClientError } from "@/lib/pixie/client/types";

export type SendPixieMessageInput = {
  state: PixieTripState;
  message: string;
  recentMessages: PixieRecentMessage[];
  draftId: string;
  signal?: AbortSignal;
  onEvent: (event: PixieChatEvent) => void;
};

export class PixieChatApiError extends Error {
  error: PixieClientError;

  constructor(error: PixieClientError) {
    super(error.message);
    this.name = "PixieChatApiError";
    this.error = error;
  }
}

async function readJsonError(response: Response): Promise<PixieClientError> {
  try {
    const data = (await response.json()) as { error?: PixieClientError };
    return data.error ?? { code: "request_failed", message: "Pixie could not complete that request." };
  } catch {
    return { code: "request_failed", message: "Pixie could not complete that request." };
  }
}

export async function sendPixieMessage(input: SendPixieMessageInput) {
  const response = await fetch("/api/pixie/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify({
      state: input.state,
      message: input.message,
      recentMessages: input.recentMessages,
      draftId: input.draftId,
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    throw new PixieChatApiError(await readJsonError(response));
  }

  if (!response.body) {
    throw new PixieChatApiError({ code: "empty_response", message: "Pixie returned an empty response." });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      input.onEvent(JSON.parse(trimmed) as PixieChatEvent);
    }
  }

  const finalLine = buffer.trim();
  if (finalLine) {
    input.onEvent(JSON.parse(finalLine) as PixieChatEvent);
  }
}

