import { buildPixieSystemPrompt } from "@/lib/pixie/ai/prompts";
import type { PixieModelOptions, PixieModelProvider, PixieModelProviderResult, PixiePlannerTurnInput } from "@/lib/pixie/ai/provider";
import { PIXIE_AI_PROMPT_VERSION, PIXIE_AI_PROVIDER_VERSION, pixieModelTurnResultSchema } from "@/lib/pixie/ai/schemas";
import { getPixieAiConfig, withTimeoutSignal } from "@/lib/pixie/ai/safety";
import { getPixieModelToolDefinitions } from "@/lib/pixie/ai/tool-registry";

type OpenAIResponsesPayload = {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: {
      cached_tokens?: number;
    };
  };
};

function requireOpenAiApiKey(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return apiKey;
}

function extractOutputText(payload: OpenAIResponsesPayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const pieces =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text?.trim())) ?? [];
  return pieces.join("\n").trim();
}

function parseStructuredOutput(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("OpenAI structured response was not valid JSON.");
  }
}

export function createOpenAiPixieProvider(env: NodeJS.ProcessEnv = process.env): PixieModelProvider {
  return {
    async createPlannerTurn(input: PixiePlannerTurnInput, options: PixieModelOptions = {}): Promise<PixieModelProviderResult> {
      const started = Date.now();
      const apiKey = requireOpenAiApiKey(env);
      const config = getPixieAiConfig(env);
      const model = options.model ?? config.model;
      const timeoutMs = options.timeoutMs ?? config.modelTimeoutMs;
      const timeout = withTimeoutSignal(timeoutMs, options.signal);

      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: timeout.signal,
          body: JSON.stringify({
            model,
            instructions: buildPixieSystemPrompt(input.availableTools.length ? input.availableTools : getPixieModelToolDefinitions()),
            input: [
              {
                role: "user",
                content: JSON.stringify({
                  latestUserMessage: input.latestUserMessage,
                  currentState: input.currentState,
                  completeness: input.completeness,
                  recentMessages: input.recentMessages,
                  destinationScope: input.destinationScope,
                  priorToolResults: input.priorToolResults ?? [],
                }),
              },
            ],
            max_output_tokens: options.maxOutputTokens ?? config.maxOutputTokens,
            text: {
              format: {
                type: "json_schema",
                name: "pixie_model_turn_result",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["assistantResponse", "tripPatch", "requestedTools", "planningIntent", "confidence", "warnings"],
                  properties: {
                    assistantResponse: { type: "string" },
                    tripPatch: { type: "object", additionalProperties: true },
                    requestedTools: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["name", "input"],
                        properties: {
                          name: { type: "string", enum: ["get_planner_status", "apply_trip_patch", "recommend_resorts", "find_ready_stays", "generate_plan_outline"] },
                          input: { type: "object", additionalProperties: true },
                          requestId: { type: "string" },
                          reason: { type: "string" },
                        },
                      },
                    },
                    nextQuestionKey: {
                      type: "string",
                      enum: ["ask_dates", "ask_party", "ask_budget_context", "ask_trip_priorities", "ask_pace", "ask_park_days", "ask_resort_choice", "ask_room_type"],
                    },
                    planningIntent: {
                      type: "string",
                      enum: [
                        "collect_information",
                        "clarify_information",
                        "update_trip",
                        "recommend_resorts",
                        "find_ready_stays",
                        "explain_recommendation",
                        "revise_plan",
                        "prepare_booking_handoff",
                        "general_disney_planning",
                        "unsupported_request",
                      ],
                    },
                    confidence: { type: "number" },
                    warnings: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI Responses API error: ${response.status}`);
        }

        const payload = (await response.json()) as OpenAIResponsesPayload;
        const parsed = pixieModelTurnResultSchema.parse(parseStructuredOutput(extractOutputText(payload)));
        const usage = {
          provider: "openai",
          model,
          promptVersion: PIXIE_AI_PROMPT_VERSION,
          inputTokens: payload.usage?.input_tokens,
          outputTokens: payload.usage?.output_tokens,
          cachedInputTokens: payload.usage?.input_tokens_details?.cached_tokens,
          totalTokens: payload.usage?.total_tokens,
          durationMs: Date.now() - started,
        };

        return {
          result: parsed,
          metadata: {
            provider: "openai",
            model,
            promptVersion: PIXIE_AI_PROMPT_VERSION,
            sourceVersion: PIXIE_AI_PROVIDER_VERSION,
          },
          usage,
          rawResponseId: payload.id,
        };
      } finally {
        timeout.clear();
      }
    },
  };
}

