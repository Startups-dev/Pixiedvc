"use client";

import type { PixiePlannerStreamEvent, PixiePlannerTurnResult } from "@/lib/pixie/ai/orchestrator";
import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieReadyStayMatchResult } from "@/lib/pixie/ready-stays/types";
import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieCompletenessResult, PixieQuestionKey } from "@/lib/pixie/types";

export type PixieClientMessageRole = "user" | "assistant" | "status";

export type PixieClientMessage = {
  id: string;
  role: PixieClientMessageRole;
  content: string;
  createdAt: string;
};

export type PixieClientError = {
  code: string;
  message: string;
  retryAfterMs?: number;
};

export type PixieChatStatus = "idle" | "sending" | "thinking" | "updating_trip" | "comparing_resorts" | "checking_ready_stays" | "complete" | "error" | "cancelled";

export type PixieChatState = {
  draftId: string;
  tripState: PixieTripState;
  messages: PixieClientMessage[];
  recentMessages: PixieRecentMessage[];
  status: PixieChatStatus;
  activeTurnId?: string;
  pendingInput: string;
  currentAssistantText: string;
  recommendations?: PixieRecommendationResult;
  readyStayMatches?: PixieReadyStayMatchResult;
  planOutline?: unknown;
  completeness: PixieCompletenessResult;
  nextQuestionKey?: PixieQuestionKey;
  warnings: string[];
  error?: PixieClientError;
  recoveryNotice?: string;
  hasSentFirstMessage: boolean;
  savePromptShown: boolean;
};

export type PixieChatEvent = PixiePlannerStreamEvent;
export type PixieChatTurnResult = PixiePlannerTurnResult;
