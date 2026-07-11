import type { PixieAiToolRequest } from "@/lib/pixie/ai/schemas";
import type { PixieRegisteredTool, PixieToolExecutionContext, PixieToolResult } from "@/lib/pixie/ai/tool-contract";
import { getPixieToolRegistry } from "@/lib/pixie/ai/tool-registry";
import { PIXIE_AI_LIMITS } from "@/lib/pixie/ai/safety";

export async function executePixieTool(params: {
  toolRequest: PixieAiToolRequest;
  currentState: PixieToolExecutionContext["currentState"];
  registry?: Record<string, PixieRegisteredTool>;
  now?: string;
}): Promise<PixieToolResult> {
  const started = Date.now();
  const registry = params.registry ?? getPixieToolRegistry();
  const tool = registry[params.toolRequest.name];
  if (!tool) {
    return {
      ok: false,
      toolName: params.toolRequest.name,
      errorCode: "unsupported_tool",
      message: `Unsupported Pixie tool: ${params.toolRequest.name}`,
      durationMs: Date.now() - started,
      trusted: true,
    };
  }

  const parsed = tool.inputSchema.safeParse(params.toolRequest.input ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      toolName: tool.name,
      errorCode: "tool_input_invalid",
      message: parsed.error.issues[0]?.message ?? "Tool input is invalid.",
      durationMs: Date.now() - started,
      trusted: true,
    };
  }

  try {
    const result = await Promise.race([
      Promise.resolve(tool.execute(parsed.data, { currentState: params.currentState, now: params.now })),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("tool_timeout")), Math.min(tool.timeoutMs, PIXIE_AI_LIMITS.maxToolExecutionMs))),
    ]);
    return {
      ok: true,
      toolName: tool.name,
      result,
      durationMs: Date.now() - started,
      trusted: true,
    };
  } catch (error) {
    return {
      ok: false,
      toolName: tool.name,
      errorCode: error instanceof Error && error.message === "tool_timeout" ? "provider_timeout" : "tool_execution_failed",
      message: error instanceof Error ? error.message : "Tool execution failed.",
      durationMs: Date.now() - started,
      trusted: true,
    };
  }
}

export function dedupePixieToolRequests(requests: PixieAiToolRequest[], maxCount = PIXIE_AI_LIMITS.maxToolCallsPerTurn) {
  const seen = new Set<string>();
  const result: PixieAiToolRequest[] = [];
  for (const request of requests) {
    const key = `${request.name}:${JSON.stringify(request.input ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(request);
    if (result.length >= maxCount) break;
  }
  return result;
}

