import type { PixieProviderUsage } from "@/lib/pixie/ai/schemas";

export type PixieTurnUsage = PixieProviderUsage & {
  toolRounds: number;
  toolCalls: number;
};

export function emptyPixieUsage(provider: string, model: string, promptVersion: string): PixieTurnUsage {
  return {
    provider,
    model,
    promptVersion,
    toolRounds: 0,
    toolCalls: 0,
  };
}

export function mergePixieUsage(base: PixieTurnUsage, next?: Partial<PixieProviderUsage>, toolCalls = 0): PixieTurnUsage {
  return {
    ...base,
    model: next?.model ?? base.model,
    provider: next?.provider ?? base.provider,
    promptVersion: next?.promptVersion ?? base.promptVersion,
    inputTokens: (base.inputTokens ?? 0) + (next?.inputTokens ?? 0) || undefined,
    outputTokens: (base.outputTokens ?? 0) + (next?.outputTokens ?? 0) || undefined,
    cachedInputTokens: (base.cachedInputTokens ?? 0) + (next?.cachedInputTokens ?? 0) || undefined,
    totalTokens: (base.totalTokens ?? 0) + (next?.totalTokens ?? 0) || undefined,
    durationMs: (base.durationMs ?? 0) + (next?.durationMs ?? 0) || undefined,
    toolRounds: base.toolRounds + (toolCalls > 0 ? 1 : 0),
    toolCalls: base.toolCalls + toolCalls,
  };
}

