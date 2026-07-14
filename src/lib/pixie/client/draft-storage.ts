"use client";

import {
  deserializePixieDraft,
  PIXIE_LOCAL_DRAFT_STORAGE_KEY,
  serializePixieDraft,
} from "@/lib/pixie/local-draft";
import { pixieRecentMessageSchema } from "@/lib/pixie/ai/schemas";
import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";
import type { PixieTripState } from "@/lib/pixie/schema";

const DRAFT_MESSAGE_CAP = 6;

export type PixieStoredDraft = {
  state: PixieTripState;
  recentMessages: PixieRecentMessage[];
  recovered: boolean;
  notice?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function recoveryNotice(reason: string) {
  switch (reason) {
    case "corrupt_json":
      return "Your previous Pixie draft could not be read, so Pixie started a fresh plan.";
    case "unsupported_draft_version":
      return "Your previous Pixie draft used an older format, so Pixie started a fresh plan.";
    case "oversized":
      return "Your previous Pixie draft was too large to restore safely, so Pixie started fresh.";
    case "migrated":
      return "Pixie updated your local draft format.";
    default:
      return undefined;
  }
}

function normalizeStoredRecentMessages(value: unknown): PixieRecentMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const entry = message as Record<string, unknown>;
      const parsed = pixieRecentMessageSchema.safeParse({
        role: entry.role,
        content: entry.content,
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((message): message is PixieRecentMessage => Boolean(message))
    .slice(-DRAFT_MESSAGE_CAP);
}

export function readPixieDraftFromBrowser(): PixieStoredDraft | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY);
  const parsed = deserializePixieDraft(raw);
  if (!raw) {
    return {
      state: parsed.state,
      recentMessages: [],
      recovered: false,
    };
  }

  if (!parsed.ok) {
    window.localStorage.removeItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY);
    return {
      state: parsed.state,
      recentMessages: [],
      recovered: true,
      notice: recoveryNotice(parsed.reason),
    };
  }

  let recentMessages: PixieRecentMessage[] = [];
  try {
    const envelope = JSON.parse(raw) as { recentMessages?: unknown };
    recentMessages = normalizeStoredRecentMessages(envelope.recentMessages);
  } catch {
    recentMessages = [];
  }

  return {
    state: parsed.state,
    recentMessages,
    recovered: parsed.recovered,
    notice: parsed.recovered ? recoveryNotice(parsed.reason) : undefined,
  };
}

export function writePixieDraftToBrowser(state: PixieTripState, recentMessages: PixieRecentMessage[]) {
  if (!canUseStorage()) return;
  const serialized = serializePixieDraft(state, {
    recentMessages: normalizeStoredRecentMessages(recentMessages),
  });
  window.localStorage.setItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY, serialized);
}

export function clearPixieDraftFromBrowser() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY);
}

export { PIXIE_LOCAL_DRAFT_STORAGE_KEY };
