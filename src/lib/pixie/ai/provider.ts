import type { PixieCompletenessResult } from "@/lib/pixie/types";
import type { PixieTripState } from "@/lib/pixie/schema";
import type { HannaKnowledgeContext } from "@/lib/pixie/knowledge";
import type { DvcContext } from "@/lib/pixie/dvc";
import type { LiveDisneyContext } from "@/lib/pixie/live";
import type {
  PixieModelTurnResult,
  PixieProviderUsage,
  PixieRecentMessage,
  PixieToolName,
} from "@/lib/pixie/ai/schemas";

export type PixieModelToolDefinition = {
  name: PixieToolName;
  description: string;
  readOnly: boolean;
  confirmationRequired: boolean;
  inputSchemaDescription: string;
};

export type PixieCurrentPlanSummary = {
  travelers: string[];
  tripDates?: string;
  lodging: string[];
  parks: string[];
  dining: string[];
  activities: string[];
  importantPreferences: string[];
  dvcFacts: string[];
  openDecisions: string[];
  rejectedOptions: string[];
  attention: string[];
};

export type PixiePlannerTurnInput = {
  currentState: PixieTripState;
  currentPlanSummary?: PixieCurrentPlanSummary;
  latestUserMessage: string;
  recentMessages: PixieRecentMessage[];
  completeness: PixieCompletenessResult;
  availableTools: PixieModelToolDefinition[];
  destinationScope: "walt_disney_world";
  knowledgeContext?: HannaKnowledgeContext;
  dvcContext?: DvcContext;
  liveContext?: LiveDisneyContext;
  safeContext?: {
    requestId?: string;
    sessionId?: string;
    userId?: string;
  };
  priorToolResults?: Array<{
    toolName: PixieToolName;
    ok: boolean;
    compactResult: unknown;
  }>;
};

export type PixieModelOptions = {
  model?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type PixieModelStreamEvent =
  | { type: "assistant_text_delta"; text: string }
  | { type: "trip_patch_proposed"; patch: unknown }
  | { type: "warning"; warning: string }
  | { type: "usage"; usage: PixieProviderUsage }
  | { type: "turn_completed"; result: PixieModelTurnResult };

export type PixieModelProviderResult = {
  result: PixieModelTurnResult;
  metadata: {
    provider: string;
    model: string;
    promptVersion: string;
    sourceVersion: string;
  };
  usage: PixieProviderUsage;
  rawResponseId?: string;
};

export interface PixieModelProvider {
  createPlannerTurn(input: PixiePlannerTurnInput, options?: PixieModelOptions): Promise<PixieModelProviderResult>;
  streamPlannerTurn?(input: PixiePlannerTurnInput, options?: PixieModelOptions): AsyncIterable<PixieModelStreamEvent>;
}

export type FixturePixieProviderOptions = {
  result: PixieModelTurnResult;
  provider?: string;
  model?: string;
  promptVersion?: string;
};

export function createFixturePixieProvider(options: FixturePixieProviderOptions): PixieModelProvider {
  return {
    async createPlannerTurn() {
      return {
        result: options.result,
        metadata: {
          provider: options.provider ?? "fixture",
          model: options.model ?? "fixture-model",
          promptVersion: options.promptVersion ?? "fixture-prompt",
          sourceVersion: "fixture",
        },
        usage: {
          provider: options.provider ?? "fixture",
          model: options.model ?? "fixture-model",
          promptVersion: options.promptVersion ?? "fixture-prompt",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      };
    },
  };
}
