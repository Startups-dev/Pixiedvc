"use client";

import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";
import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";
import type { PixieClientError, PixieClientMessage, PixieChatEvent, PixieChatState, PixieChatStatus } from "@/lib/pixie/client/types";

const MAX_DISPLAY_MESSAGES = 40;
const INITIAL_ASSISTANT_MESSAGE =
  "Hi, I’m Hara. I’ll help shape a Walt Disney World trip around your family, your budget, and the experiences that matter most. To start, who will be traveling with you?";

function nowIso() {
  return new Date().toISOString();
}

function createDraftId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `pixie_draft_${random}`;
}

export function createClientMessage(role: PixieClientMessage["role"], content: string, idPrefix = "pixie_msg"): PixieClientMessage {
  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: nowIso(),
  };
}

export function createInitialPixieChatState(input: { draftId?: string; recoveredNotice?: string; messages?: PixieClientMessage[] } = {}): PixieChatState {
  const tripState = createEmptyPixieTripState();
  return {
    draftId: input.draftId ?? createDraftId(),
    tripState,
    messages: input.messages ?? [createClientMessage("assistant", INITIAL_ASSISTANT_MESSAGE, "pixie_welcome")],
    recentMessages: [],
    status: "idle",
    activeTurnId: undefined,
    pendingInput: "",
    currentAssistantText: "",
    completeness: evaluatePixieCompleteness(tripState),
    warnings: [],
    recoveryNotice: input.recoveredNotice,
    hasSentFirstMessage: false,
    savePromptShown: false,
  };
}

export function recentMessagesFromClient(messages: PixieClientMessage[]): PixieRecentMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-6)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content.slice(0, 500),
    }));
}

export function appendClientMessage(messages: PixieClientMessage[], message: PixieClientMessage) {
  return [...messages, message].slice(-MAX_DISPLAY_MESSAGES);
}

function statusForEvent(event: PixieChatEvent): PixieChatStatus {
  switch (event.type) {
    case "turn_started":
      return "thinking";
    case "trip_patch_applied":
      return "updating_trip";
    case "recommendations_ready":
      return "comparing_resorts";
    case "ready_stays_ready":
      return "checking_ready_stays";
    case "turn_failed":
      return "error";
    case "turn_completed":
      return "complete";
    default:
      return "thinking";
  }
}

export function applyPixieStreamEvent(state: PixieChatState, event: PixieChatEvent): PixieChatState {
  if (event.type === "turn_started") {
    return {
      ...state,
      activeTurnId: event.turnId,
      status: "thinking",
      error: undefined,
    };
  }

  if (state.activeTurnId !== event.turnId) {
    return state;
  }

  if (event.type === "assistant_text_delta") {
    return {
      ...state,
      status: "thinking",
      currentAssistantText: `${state.currentAssistantText}${event.text}`,
    };
  }

  if (event.type === "warning") {
    return {
      ...state,
      warnings: [...state.warnings, event.warning].slice(-8),
    };
  }

  if (event.type === "trip_patch_applied") {
    return {
      ...state,
      status: statusForEvent(event),
      tripState: event.updatedState,
      completeness: evaluatePixieCompleteness(event.updatedState),
    };
  }

  if (event.type === "recommendations_ready") {
    return {
      ...state,
      status: statusForEvent(event),
      recommendations: event.recommendations,
    };
  }

  if (event.type === "ready_stays_ready") {
    return {
      ...state,
      status: statusForEvent(event),
      readyStayMatches: event.readyStayMatches,
    };
  }

  if (event.type === "plan_outline_ready") {
    return {
      ...state,
      status: statusForEvent(event),
      planOutline: event.planOutline,
    };
  }

  if (event.type === "turn_failed") {
    return {
      ...state,
      status: "error",
      activeTurnId: undefined,
      error: {
        code: event.error.code,
        message: event.error.message,
        retryAfterMs: event.error.retryAfterMs,
      },
      currentAssistantText: "",
    };
  }

  if (event.type === "turn_completed") {
    const result = event.result;
    if (result.turnId !== event.turnId) {
      return state;
    }
    const assistantText = state.currentAssistantText || result.assistantResponse;
    const nextMessages = assistantText
      ? appendClientMessage(state.messages, createClientMessage("assistant", assistantText, "pixie_assistant"))
      : state.messages;
    return {
      ...state,
      status: "idle",
      activeTurnId: undefined,
      tripState: result.updatedState,
      completeness: result.completeness,
      recommendations: result.recommendations,
      readyStayMatches: result.readyStayMatches,
      planOutline: result.planOutline,
      nextQuestionKey: result.nextQuestionKey,
      warnings: result.warnings.slice(-8),
      currentAssistantText: "",
      messages: nextMessages,
      recentMessages: recentMessagesFromClient(nextMessages),
      error: undefined,
    };
  }

  return {
    ...state,
    status: statusForEvent(event),
  };
}

export function beginPixieTurn(state: PixieChatState, message: string): PixieChatState {
  const nextMessages = appendClientMessage(state.messages, createClientMessage("user", message, "pixie_user"));
  return {
    ...state,
    messages: nextMessages,
    recentMessages: recentMessagesFromClient(nextMessages),
    pendingInput: "",
    currentAssistantText: "",
    status: "sending",
    activeTurnId: undefined,
    recommendations: undefined,
    readyStayMatches: undefined,
    planOutline: undefined,
    warnings: [],
    error: undefined,
    hasSentFirstMessage: true,
  };
}

export function failPixieTurn(state: PixieChatState, error: PixieClientError, preserveInput = ""): PixieChatState {
  return {
    ...state,
    status: "error",
    error,
    pendingInput: preserveInput,
    currentAssistantText: "",
  };
}

export function resetPixieChatState() {
  return createInitialPixieChatState();
}

export { INITIAL_ASSISTANT_MESSAGE };
