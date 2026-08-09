import { buildPixieSystemPrompt } from "@/lib/pixie/ai/prompts";
import type { PixieModelOptions, PixieModelProvider, PixieModelProviderResult, PixiePlannerTurnInput } from "@/lib/pixie/ai/provider";
import { PixieAiException } from "@/lib/pixie/ai/errors";
import {
  PIXIE_ACTIVE_DECISION_KEYS,
  PIXIE_AI_PROMPT_VERSION,
  PIXIE_AI_PROVIDER_VERSION,
  PIXIE_CONVERSATION_MODES,
  PIXIE_DELIGHT_MOMENT_KEYS,
  PIXIE_PLANNING_INTENTS,
  PIXIE_TOOL_NAMES,
  pixieModelTurnResultSchema,
} from "@/lib/pixie/ai/schemas";
import { getPixieAiConfig, withTimeoutSignal } from "@/lib/pixie/ai/safety";
import { getPixieModelToolDefinitions } from "@/lib/pixie/ai/tool-registry";
import {
  PIXIE_AGE_GROUPS,
  PIXIE_BUDGET_TYPES,
  PIXIE_DESTINATIONS,
  PIXIE_EXPERIENCE_LEVELS,
  PIXIE_LIMITS,
  PIXIE_PRIORITY_LEVELS,
  PIXIE_SUPPORTED_CURRENCIES,
  PIXIE_TRAVELLER_CATEGORIES,
  PIXIE_VACATION_PACES,
} from "@/lib/pixie/constants";

type OpenAIResponsesPayload = {
  id?: string;
  status?: string;
  incomplete_details?: {
    reason?: string;
  } | null;
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

type OpenAIErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string | null;
  };
};

const nullableStringSchema = { type: ["string", "null"] };
function asJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function withNullType(schema: Record<string, unknown>) {
  const type = schema.type;
  if (Array.isArray(type)) {
    return type.includes("null") ? schema : { ...schema, type: [...type, "null"] };
  }
  if (typeof type === "string") return { ...schema, type: [type, "null"] };
  if (Array.isArray(schema.enum) && !schema.enum.includes(null)) return { ...schema, enum: [...schema.enum, null] };
  return { anyOf: [schema, { type: "null" }] };
}

function makeOpenAiStrictSchema(schema: unknown, options: { nullable?: boolean } = {}): unknown {
  const source = asJsonObject(schema);
  let next: Record<string, unknown> = { ...source };
  const type = next.type;
  const isObject = type === "object" || (Array.isArray(type) && type.includes("object"));
  const isArray = type === "array" || (Array.isArray(type) && type.includes("array"));

  if (Array.isArray(next.anyOf)) {
    next = { ...next, anyOf: next.anyOf.map((item) => makeOpenAiStrictSchema(item)) };
  }

  if (isObject) {
    const properties = asJsonObject(next.properties);
    const strictProperties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, makeOpenAiStrictSchema(value, { nullable: true })]),
    );
    next = {
      ...next,
      additionalProperties: false,
      required: Object.keys(strictProperties),
      properties: strictProperties,
    };
  }

  if (isArray && next.items) {
    next = { ...next, items: makeOpenAiStrictSchema(next.items) };
  }

  return options.nullable ? withNullType(next) : next;
}

const preferenceArrayJsonSchema = {
  type: "array",
  maxItems: PIXIE_LIMITS.maxPreferencesPerGroup,
  items: { type: "string", maxLength: PIXIE_LIMITS.maxShortTextLength },
};
const nullableNotesSchema = { type: ["string", "null"], maxLength: PIXIE_LIMITS.maxNoteLength };
const travellerPatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    displayName: nullableStringSchema,
    label: nullableStringSchema,
    category: { type: "string", enum: PIXIE_TRAVELLER_CATEGORIES },
    age: { type: "integer", minimum: 0, maximum: 120 },
    ageGroup: { type: "string", enum: PIXIE_AGE_GROUPS },
    interests: {
      type: "array",
      maxItems: PIXIE_LIMITS.maxTravellerInterests,
      items: { type: "string", maxLength: PIXIE_LIMITS.maxShortTextLength },
    },
    notes: nullableNotesSchema,
    accessibilityNeeds: nullableNotesSchema,
  },
};
const pixieTripPatchJsonSchemaBase = {
  type: "object",
  additionalProperties: false,
  properties: {
    destination: { type: "string", enum: PIXIE_DESTINATIONS },
    tripName: nullableStringSchema,
    dates: {
      type: "object",
      additionalProperties: false,
      properties: {
        arrivalDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        departureDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        flexibleDates: { type: "boolean" },
        flexibilityDaysBefore: { type: "integer", minimum: 0, maximum: PIXIE_LIMITS.maxFlexibleDateWindowDays },
        flexibilityDaysAfter: { type: "integer", minimum: 0, maximum: PIXIE_LIMITS.maxFlexibleDateWindowDays },
        dateNotes: nullableNotesSchema,
      },
    },
    party: {
      type: "object",
      additionalProperties: false,
      properties: {
        adults: { type: "integer", minimum: 0, maximum: PIXIE_LIMITS.maxPartySize },
        children: { type: "integer", minimum: 0, maximum: PIXIE_LIMITS.maxPartySize },
        partyNotes: nullableNotesSchema,
        travellerOperations: {
          type: "array",
          maxItems: PIXIE_LIMITS.maxArrayItems,
          items: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["op", "traveller"],
                properties: {
                  op: { type: "string", enum: ["addTraveller"] },
                  traveller: {
                    ...travellerPatchJsonSchema,
                    properties: {
                      ...travellerPatchJsonSchema.properties,
                      id: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,80}$" },
                    },
                  },
                },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["op", "id", "changes"],
                properties: {
                  op: { type: "string", enum: ["updateTraveller"] },
                  id: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,80}$" },
                  changes: travellerPatchJsonSchema,
                },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["op", "id"],
                properties: {
                  op: { type: "string", enum: ["removeTraveller"] },
                  id: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,80}$" },
                },
              },
            ],
          },
        },
      },
    },
    budget: {
      type: "object",
      additionalProperties: false,
      properties: {
        amountCents: { type: "integer", minimum: 0 },
        currency: { type: "string", enum: PIXIE_SUPPORTED_CURRENCIES },
        budgetType: { type: "string", enum: PIXIE_BUDGET_TYPES },
        notes: nullableNotesSchema,
      },
    },
    preferences: {
      type: "object",
      additionalProperties: false,
      properties: {
        parkPriorities: preferenceArrayJsonSchema,
        favoriteCharactersOrThemes: preferenceArrayJsonSchema,
        attractionInterests: preferenceArrayJsonSchema,
        resortPriorities: preferenceArrayJsonSchema,
        preferredResorts: preferenceArrayJsonSchema,
        excludedResorts: preferenceArrayJsonSchema,
        roomPreferences: preferenceArrayJsonSchema,
        transportationPreferences: preferenceArrayJsonSchema,
        diningPreferences: preferenceArrayJsonSchema,
        vacationPace: { type: "string", enum: PIXIE_VACATION_PACES },
        poolImportance: { type: "string", enum: PIXIE_PRIORITY_LEVELS },
        kitchenImportance: { type: "string", enum: PIXIE_PRIORITY_LEVELS },
        walkingSensitivity: { type: "string", enum: PIXIE_PRIORITY_LEVELS },
        splitStayOpenness: { type: "boolean" },
        previousDisneyExperience: { type: "string", enum: PIXIE_EXPERIENCE_LEVELS },
        celebrationNotes: nullableNotesSchema,
        generalNotes: nullableNotesSchema,
        parkDayIntention: { type: "boolean" },
      },
    },
    accessibility: {
      type: "object",
      additionalProperties: false,
      properties: {
        mobilityConsiderations: nullableNotesSchema,
        sensoryConsiderations: nullableNotesSchema,
        dietaryConsiderations: nullableNotesSchema,
        restFrequencyNeeds: nullableNotesSchema,
        strollerOrWheelchairConsiderations: nullableNotesSchema,
        planningNotes: nullableNotesSchema,
      },
    },
    selectedOptions: {
      type: "object",
      additionalProperties: false,
      properties: {
        selectedResortId: nullableStringSchema,
        selectedResortSlug: nullableStringSchema,
        selectedRoomType: nullableStringSchema,
        selectedReadyStayId: nullableStringSchema,
        selectedRecommendationId: nullableStringSchema,
      },
    },
    metadata: {
      type: "object",
      additionalProperties: false,
      properties: {
        source: { type: "string", enum: ["pixie", "imported_trip_intent", "manual"] },
        draftId: nullableStringSchema,
        lastInteractionAt: { type: "string" },
        affiliate: {
          type: "object",
          additionalProperties: false,
          properties: {
            referralCode: nullableStringSchema,
            landingPath: nullableStringSchema,
            visitorId: nullableStringSchema,
            sessionId: nullableStringSchema,
          },
        },
      },
    },
  },
};
const pixieTripPatchJsonSchema = makeOpenAiStrictSchema(pixieTripPatchJsonSchemaBase);
const OUTPUT_LIMIT_FALLBACK_MESSAGE =
  "Hara could not finish this planning turn within the current model capacity. Please send the availability details in two smaller parts, and Hara can continue from there.";

function requireOpenAiApiKey(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new PixieAiException("configuration_error", "OPENAI_API_KEY is required for the Pixie OpenAI provider.");
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
    throw new PixieAiException("invalid_model_output", "OpenAI structured response was not valid JSON.");
  }
}

function isMaxOutputIncomplete(payload: OpenAIResponsesPayload) {
  return payload.status === "incomplete" && payload.incomplete_details?.reason === "max_output_tokens";
}

function retryMaxOutputTokens(initialMaxOutputTokens: number) {
  return Math.max(initialMaxOutputTokens + 1200, Math.ceil(initialMaxOutputTokens * 1.75));
}

function retryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return undefined;
  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(retryAfter);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return undefined;
}

async function readOpenAiErrorPayload(response: Response): Promise<OpenAIErrorPayload> {
  try {
    return (await response.json()) as OpenAIErrorPayload;
  } catch {
    return {};
  }
}

async function throwOpenAiProviderError(response: Response): Promise<never> {
  const payload = await readOpenAiErrorPayload(response);
  const providerCode = payload.error?.code ?? payload.error?.type;
  const providerMessage = payload.error?.message?.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 240);
  const retryMs = retryAfterMs(response);

  if (response.status === 401) {
    throw new PixieAiException("authentication_failed", "OpenAI authentication failed. Check OPENAI_API_KEY access without exposing the key.", { status: response.status });
  }

  if (response.status === 429) {
    throw new PixieAiException("rate_limited", "OpenAI rate limit exceeded for the configured Pixie model.", { status: response.status, retryAfterMs: retryMs });
  }

  if (response.status === 404 || providerCode === "model_not_found") {
    throw new PixieAiException("model_not_found", "Configured PIXIE_MODEL is not accessible to the OpenAI API key.", { status: response.status });
  }

  throw new PixieAiException("provider_unavailable", `OpenAI Responses API request failed with status ${response.status}${providerMessage ? `: ${providerMessage}` : ""}.`, { status: response.status, retryAfterMs: retryMs });
}

export function createOpenAiPixieProvider(env: NodeJS.ProcessEnv = process.env): PixieModelProvider {
  return {
    async createPlannerTurn(input: PixiePlannerTurnInput, options: PixieModelOptions = {}): Promise<PixieModelProviderResult> {
      const started = Date.now();
      const apiKey = requireOpenAiApiKey(env);
      const config = getPixieAiConfig(env);
      const model = options.model ?? config.model;
      const timeoutMs = options.timeoutMs ?? config.modelTimeoutMs;
      const initialMaxOutputTokens = options.maxOutputTokens ?? config.maxOutputTokens;
      const maxOutputTokenAttempts = [initialMaxOutputTokens, retryMaxOutputTokens(initialMaxOutputTokens)];
      let retriedAfterOutputLimit = false;

      for (let attempt = 0; attempt < maxOutputTokenAttempts.length; attempt += 1) {
        const timeout = withTimeoutSignal(timeoutMs, options.signal);
        let response: Response;
        try {
          response = await fetch("https://api.openai.com/v1/responses", {
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
              max_output_tokens: maxOutputTokenAttempts[attempt],
              text: {
                format: {
                  type: "json_schema",
                  name: "pixie_model_turn_result",
                  strict: true,
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "assistantResponse",
                      "tripPatch",
                      "requestedTools",
                      "nextQuestionKey",
                      "planningIntent",
                      "conversationMode",
                      "activeDecisionKey",
                      "delightMomentKey",
                      "confidence",
                      "warnings",
                    ],
                    properties: {
                      assistantResponse: { type: "string" },
                      tripPatch: pixieTripPatchJsonSchema,
                      requestedTools: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: ["name", "input", "requestId", "reason"],
                          properties: {
                            name: { type: "string", enum: PIXIE_TOOL_NAMES },
                            input: { type: "object", additionalProperties: false, required: [], properties: {} },
                            requestId: { type: ["string", "null"] },
                            reason: { type: ["string", "null"] },
                          },
                        },
                      },
                      nextQuestionKey: {
                        type: ["string", "null"],
                        enum: ["ask_dates", "ask_party", "ask_budget_context", "ask_trip_priorities", "ask_pace", "ask_park_days", "ask_resort_choice", "ask_room_type", null],
                      },
                      planningIntent: {
                        type: "string",
                        enum: PIXIE_PLANNING_INTENTS,
                      },
                      conversationMode: {
                        type: ["string", "null"],
                        enum: [...PIXIE_CONVERSATION_MODES, null],
                      },
                      activeDecisionKey: {
                        type: ["string", "null"],
                        enum: [...PIXIE_ACTIVE_DECISION_KEYS, null],
                      },
                      delightMomentKey: {
                        type: ["string", "null"],
                        enum: [...PIXIE_DELIGHT_MOMENT_KEYS, null],
                      },
                      confidence: { type: "number" },
                      warnings: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            }),
          });
        } catch (error) {
          if (timeout.signal.aborted) {
            if (retriedAfterOutputLimit) throw new PixieAiException("invalid_model_output", OUTPUT_LIMIT_FALLBACK_MESSAGE);
            throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
          }
          if (error instanceof PixieAiException) throw error;
          throw new PixieAiException("provider_unavailable", "OpenAI provider request failed before a response was received.");
        } finally {
          timeout.clear();
        }

        if (!response.ok) await throwOpenAiProviderError(response);

        try {
          const payload = (await response.json()) as OpenAIResponsesPayload;
          if (isMaxOutputIncomplete(payload)) {
            if (attempt === 0) {
              retriedAfterOutputLimit = true;
              continue;
            }
            throw new PixieAiException("invalid_model_output", OUTPUT_LIMIT_FALLBACK_MESSAGE);
          }

          const outputText = extractOutputText(payload);
          if (!outputText) {
            throw new PixieAiException("invalid_model_output", "OpenAI structured response was empty.");
          }
          const parsed = pixieModelTurnResultSchema.parse(parseStructuredOutput(outputText));
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
        } catch (error) {
          if (error instanceof PixieAiException) throw error;
          throw new PixieAiException("invalid_model_output", "OpenAI structured response did not match PixieModelTurnResult.");
        }
      }

      throw new PixieAiException("invalid_model_output", OUTPUT_LIMIT_FALLBACK_MESSAGE);
    },
  };
}
