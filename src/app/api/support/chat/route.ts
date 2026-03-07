import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase-service-client";
import {
  buildExcerpt,
  buildSupportContext,
} from "@/lib/support/retrieval";
import { buildSupportSystemPrompt } from "@/lib/support/prompt";
import { SUPPORT_EXAMPLES } from "@/lib/support/examples";

type ChatRole = "user" | "assistant";

type SupportChatMessage = {
  role: ChatRole;
  content: string;
};

type SupportDoc = {
  slug: string;
  title: string;
  category: string;
  content: string;
  updated_at?: string;
  similarity?: number;
};

type SupportSource = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
};

type SupportChatDebugLog = {
  stage: string;
  ok: boolean;
  usedFallback: boolean;
  hasOpenAIKey: boolean;
  kbMatchCount: number;
  pageUrl: string | null;
  errorMessage?: string;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const globalRateLimit = globalThis as typeof globalThis & {
  __supportRateLimit?: Map<string, number[]>;
};
const rateLimitStore = globalRateLimit.__supportRateLimit ?? new Map<string, number[]>();
if (!globalRateLimit.__supportRateLimit) {
  globalRateLimit.__supportRateLimit = rateLimitStore;
}

function logSupportChatDebug(payload: SupportChatDebugLog) {
  console.log("[support/chat/debug]", payload);
}

function logSupportChatError(payload: SupportChatDebugLog) {
  console.error("[support/chat/debug]", payload);
}

function logSupportChatBranch(
  label:
    | "fallback:no-openai-key"
    | "fallback:conversation-persistence-failed"
    | "fallback:embedding-failed"
    | "fallback:no-kb-match"
    | "fallback:chat-completion-failed"
    | "fallback:empty-model-response"
    | "success:ai-response"
    | "success:kb-fallback",
  payload: Omit<SupportChatDebugLog, "stage">,
) {
  console.log("[support/chat/branch]", { stage: label, ...payload });
}

function fallbackResponse() {
  return {
    answer:
      "I’m not fully sure from our help docs yet. If you’d like, I can connect you with a concierge for a precise answer.",
    sources: [],
    confidence: "low",
    handoffSuggested: true,
  };
}

function derivePageContext(pageUrl: string) {
  let path = "";
  try {
    if (pageUrl) {
      path = new URL(pageUrl).pathname || "";
    }
  } catch {
    path = "";
  }

  const routeType = path.startsWith("/resorts/")
    ? "resort"
    : path.startsWith("/calculator")
      ? "calculator"
      : path.startsWith("/owner/onboarding")
        ? "owner_onboarding"
        : path.startsWith("/owner")
          ? "owner_portal"
          : path.startsWith("/ready-stays")
            ? "ready_stays"
            : path.startsWith("/booking/deposit")
              ? "payment_deposit"
              : path
                ? "general"
                : "unknown";

  const resortSlug =
    path.startsWith("/resorts/") && path.split("/").length > 2
      ? path.split("/")[2] || null
      : null;

  return {
    pageUrl: pageUrl || null,
    path: path || null,
    routeType,
    resortSlug,
    isCalculator: path.startsWith("/calculator"),
    isReadyStays: path.startsWith("/ready-stays"),
    isOwnerPage: path.startsWith("/owner"),
    isPaymentPage: path.startsWith("/booking/deposit"),
  };
}

function checkRateLimit(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const history = (rateLimitStore.get(ip) || []).filter((ts) => ts > windowStart);
  if (history.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  history.push(now);
  rateLimitStore.set(ip, history);
  return true;
}

async function keywordRetrieve(
  supabase: ReturnType<typeof createServiceClient>,
  query: string,
  selectedCategory: string,
) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);

  const orParts = [`title.ilike.%${query}%`, `content.ilike.%${query}%`];
  for (const token of tokens) {
    orParts.push(`title.ilike.%${token}%`);
    orParts.push(`content.ilike.%${token}%`);
  }

  const { data, error } = await supabase
    .from("support_kb_documents")
    .select("slug,title,category,content,updated_at")
    .or(orParts.join(","))
    .limit(6);

  if (error || !data || data.length === 0) {
    return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
  }

  let matches = data as SupportDoc[];
  if (selectedCategory) {
    matches = matches.filter((match) => match.category === selectedCategory);
  }

  const scored = matches
    .map((doc) => {
      const haystack = `${doc.title} ${doc.content}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (doc.title.toLowerCase().includes(token)) score += 3;
        if (haystack.includes(token)) score += 1;
      }
      if (doc.title.toLowerCase().includes(query.toLowerCase())) score += 4;
      return { ...doc, similarity: Math.min(1, score / 10) };
    })
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  const top = scored[0];
  if (!top || (top.similarity ?? 0) < 0.2) {
    return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
  }

  return {
    docs: scored,
    confidence: (top.similarity ?? 0) >= 0.6 ? ("high" as const) : ("medium" as const),
    handoffSuggested: (top.similarity ?? 0) < 0.6,
  };
}

async function semanticRetrieve(
  _supabase: ReturnType<typeof createServiceClient>,
  _query: string,
  _selectedCategory: string,
  logBase: Pick<SupportChatDebugLog, "hasOpenAIKey" | "pageUrl">,
) {
  logSupportChatError({
    stage: "embedding",
    ok: false,
    usedFallback: true,
    hasOpenAIKey: logBase.hasOpenAIKey,
    kbMatchCount: 0,
    pageUrl: logBase.pageUrl,
    errorMessage: "semantic_retrieval_disabled_without_openai_embeddings",
  });
  logSupportChatBranch("fallback:embedding-failed", {
    ok: false,
    usedFallback: true,
    hasOpenAIKey: logBase.hasOpenAIKey,
    kbMatchCount: 0,
    pageUrl: logBase.pageUrl,
    errorMessage: "semantic_retrieval_disabled_without_openai_embeddings",
  });
  return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
}

function buildSources(docs: SupportDoc[]): SupportSource[] {
  return docs.slice(0, 3).map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    excerpt: buildExcerpt(doc.content),
  }));
}

function buildExampleConversationBlock() {
  return SUPPORT_EXAMPLES.map(
    (item) =>
      `Example conversation:\nUser: ${item.user}\nAssistant: ${item.assistant}`,
  ).join("\n\n");
}

export async function POST(request: Request) {
  const hasOpenAIKey = Boolean(process.env.GEMINI_API_KEY);
  let pageUrlForLog: string | null = null;
  let finalKbMatchCount = 0;

  try {
    if (!checkRateLimit(request)) {
      logSupportChatDebug({
        stage: "rate-limit",
        ok: false,
        usedFallback: true,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: "rate_limited",
      });
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const messages = (body?.messages ?? []) as SupportChatMessage[];
    const lastMessage = messages[messages.length - 1];
    const selectedCategory = body?.category ? String(body.category) : "";
    const pageUrl = body?.pageUrl ? String(body.pageUrl) : "";
    pageUrlForLog = pageUrl || null;
    const conversationId = body?.conversationId ? String(body.conversationId) : null;

    logSupportChatDebug({
      stage: "request-received",
      ok: true,
      usedFallback: false,
      hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: pageUrlForLog,
    });

    if (!lastMessage || lastMessage.role !== "user") {
      logSupportChatDebug({
        stage: "validation",
        ok: false,
        usedFallback: true,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: "missing_user_message",
      });
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    if (!hasOpenAIKey) {
      logSupportChatBranch("fallback:no-openai-key", {
        ok: false,
        usedFallback: true,
        hasOpenAIKey: false,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: "openai_key_missing",
      });
      return NextResponse.json(fallbackResponse());
    }

    const query = lastMessage.content.trim();
    const context = derivePageContext(pageUrl);
    let supabase: ReturnType<typeof createServiceClient> | null = null;

    try {
      supabase = createServiceClient();
    } catch (error) {
      logSupportChatError({
        stage: "supabase-client",
        ok: false,
        usedFallback: false,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: error instanceof Error ? error.message : "supabase_client_failed",
      });
    }

    let activeConversationId = conversationId;
    let userMessageId: string | null = null;
    if (supabase) {
      try {
        if (!activeConversationId) {
          const { data: conversation, error: conversationError } = await supabase
            .from("support_conversations")
            .insert({
              status: "ai",
              page_url: context.pageUrl,
              context,
            })
            .select("id")
            .single();
          if (conversationError || !conversation) {
            logSupportChatError({
              stage: "conversation-persistence",
              ok: false,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: 0,
              pageUrl: pageUrlForLog,
              errorMessage: conversationError?.message ?? "conversation_create_failed",
            });
            logSupportChatBranch("fallback:conversation-persistence-failed", {
              ok: false,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: 0,
              pageUrl: pageUrlForLog,
              errorMessage: conversationError?.message ?? "conversation_create_failed",
            });
          } else {
            activeConversationId = conversation.id;
          }
        } else {
          const { error: conversationUpdateError } = await supabase
            .from("support_conversations")
            .update({ page_url: context.pageUrl, context, status: "ai" })
            .eq("id", activeConversationId);
          logSupportChatDebug({
            stage: "conversation-persistence",
            ok: !conversationUpdateError,
            usedFallback: false,
            hasOpenAIKey,
            kbMatchCount: 0,
            pageUrl: pageUrlForLog,
            errorMessage: conversationUpdateError?.message,
          });
        }
      } catch (error) {
        logSupportChatError({
          stage: "conversation-persistence",
          ok: false,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: error instanceof Error ? error.message : "conversation_persistence_failed",
        });
        logSupportChatBranch("fallback:conversation-persistence-failed", {
          ok: false,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: error instanceof Error ? error.message : "conversation_persistence_failed",
        });
      }

      if (activeConversationId) {
        try {
          const { data: userMessageRow } = await supabase
            .from("support_messages")
            .insert({
              conversation_id: activeConversationId,
              sender: "guest",
              content: query,
              metadata: { pageUrl: context.pageUrl, context },
            })
            .select("id")
            .single();
          userMessageId = userMessageRow?.id ?? null;
        } catch (error) {
          logSupportChatError({
            stage: "message-persistence-user",
            ok: false,
            usedFallback: false,
            hasOpenAIKey,
            kbMatchCount: 0,
            pageUrl: pageUrlForLog,
            errorMessage: error instanceof Error ? error.message : "user_message_insert_failed",
          });
        }
      }
    }

    logSupportChatDebug({
      stage: "message-persistence-user",
      ok: Boolean(userMessageId),
      usedFallback: false,
      hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: pageUrlForLog,
      errorMessage: userMessageId ? undefined : "user_message_not_persisted",
    });

    let retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
    if (supabase) {
      try {
        retrieval = await semanticRetrieve(supabase, query, selectedCategory, {
          hasOpenAIKey,
          pageUrl: pageUrlForLog,
        });
      } catch (error) {
        logSupportChatError({
          stage: "semantic-retrieval",
          ok: false,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: error instanceof Error ? error.message : "semantic_retrieval_failed",
        });
        retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
      }
      if (retrieval.docs.length === 0) {
        try {
          retrieval = await keywordRetrieve(supabase, query, selectedCategory);
        } catch (error) {
          logSupportChatError({
            stage: "keyword-retrieval",
            ok: false,
            usedFallback: false,
            hasOpenAIKey,
            kbMatchCount: 0,
            pageUrl: pageUrlForLog,
            errorMessage: error instanceof Error ? error.message : "keyword_retrieval_failed",
          });
          retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
        }
        logSupportChatDebug({
          stage: "keyword-retrieval",
          ok: true,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: retrieval.docs.length,
          pageUrl: pageUrlForLog,
        });
      }
    }
    finalKbMatchCount = retrieval.docs.length;
    if (finalKbMatchCount === 0) {
      logSupportChatBranch("fallback:no-kb-match", {
        ok: false,
        usedFallback: false,
        hasOpenAIKey,
        kbMatchCount: finalKbMatchCount,
        pageUrl: pageUrlForLog,
        errorMessage: "no_kb_match",
      });
    }

    const sources = buildSources(retrieval.docs);

    const contextBlock = [
      `Route type: ${context.routeType}`,
      `Page URL: ${context.pageUrl ?? "unknown"}`,
      `Path: ${context.path ?? "unknown"}`,
      `Resort slug: ${context.resortSlug ?? "none"}`,
      `Ready stay page: ${context.isReadyStays ? "yes" : "no"}`,
      `Calculator page: ${context.isCalculator ? "yes" : "no"}`,
      `Owner page: ${context.isOwnerPage ? "yes" : "no"}`,
      `Payment page: ${context.isPaymentPage ? "yes" : "no"}`,
      selectedCategory ? `Selected category: ${selectedCategory}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const kbContext = retrieval.docs.length
      ? buildSupportContext(
          retrieval.docs.map((doc) => ({
            slug: doc.slug,
            title: doc.title,
            category: doc.category,
            content: doc.content,
            similarity: doc.similarity ?? 0,
          })),
        )
      : "No support knowledge snippets were matched.";

    const handoffSuggested =
      retrieval.docs.length === 0 ? true : retrieval.handoffSuggested || retrieval.confidence === "medium";
    const contextualPrompt = [
      buildSupportSystemPrompt(),
      `Current page context:\n${contextBlock}`,
      `Knowledge snippets:\n${kbContext}`,
      `Example conversations:\n${buildExampleConversationBlock()}`,
      [
        "Live conversation:",
        ...messages
          .slice(-8)
          .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`),
      ].join("\n"),
    ].join("\n\n");

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const emit = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        void (async () => {
          let answer = "";
          let assistantMessageId: string | null = null;
          let streamUsedFallback = false;
          emit({
            type: "start",
            conversationId: activeConversationId,
            userMessageId,
          });

          try {
            logSupportChatDebug({
              stage: "chat-completion",
              ok: true,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
            });

            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
            });
            const result = await model.generateContentStream(contextualPrompt);
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (!text) continue;
              answer += text;
              emit({ type: "chunk", text });
            }

            if (!answer.trim()) {
              streamUsedFallback = true;
              logSupportChatBranch("fallback:empty-model-response", {
                ok: false,
                usedFallback: true,
                hasOpenAIKey,
                kbMatchCount: finalKbMatchCount,
                pageUrl: pageUrlForLog,
                errorMessage: "empty_model_response",
              });
              throw new Error("empty_model_response");
            }

            logSupportChatBranch("success:ai-response", {
              ok: true,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
            });
            logSupportChatDebug({
              stage: "chat-completion-result",
              ok: true,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
            });
          } catch (error) {
            streamUsedFallback = true;
            logSupportChatBranch("fallback:chat-completion-failed", {
              ok: false,
              usedFallback: true,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
              errorMessage: error instanceof Error ? error.message : "chat_completion_failed",
            });
            logSupportChatError({
              stage: "chat-completion-result",
              ok: false,
              usedFallback: true,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
              errorMessage: error instanceof Error ? error.message : "chat_completion_failed",
            });
            if (retrieval.docs.length > 0) {
              logSupportChatBranch("success:kb-fallback", {
                ok: true,
                usedFallback: true,
                hasOpenAIKey,
                kbMatchCount: finalKbMatchCount,
                pageUrl: pageUrlForLog,
              });
              answer =
                retrieval.docs[0]?.content
                  .split(/(?<=[.!?])\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(" ") ||
                "Based on our help docs, here’s what we can share. If you need anything specific, I can connect you with concierge.";
            } else {
              answer = fallbackResponse().answer;
            }
            emit({ type: "chunk", text: answer });
          }

          if (supabase && activeConversationId) {
            try {
              const { data: assistantMessageRow } = await supabase
                .from("support_messages")
                .insert({
                  conversation_id: activeConversationId,
                  sender: "ai",
                  content: answer,
                  metadata: {
                    confidence: retrieval.confidence,
                    handoffSuggested,
                    sources: sources.map((source) => ({
                      slug: source.slug,
                      title: source.title,
                      category: source.category,
                    })),
                    context,
                  },
                })
                .select("id")
                .single();
              assistantMessageId = assistantMessageRow?.id ?? null;
            } catch (error) {
              logSupportChatError({
                stage: "message-persistence-assistant",
                ok: false,
                usedFallback: streamUsedFallback,
                hasOpenAIKey,
                kbMatchCount: finalKbMatchCount,
                pageUrl: pageUrlForLog,
                errorMessage: error instanceof Error ? error.message : "assistant_message_insert_failed",
              });
            }
          }

          logSupportChatDebug({
            stage: "message-persistence-assistant",
            ok: Boolean(assistantMessageId),
            usedFallback: streamUsedFallback,
            hasOpenAIKey,
            kbMatchCount: finalKbMatchCount,
            pageUrl: pageUrlForLog,
            errorMessage: assistantMessageId ? undefined : "assistant_message_not_persisted",
          });

          logSupportChatDebug({
            stage: "final-response",
            ok: true,
            usedFallback: streamUsedFallback,
            hasOpenAIKey,
            kbMatchCount: finalKbMatchCount,
            pageUrl: pageUrlForLog,
            errorMessage: streamUsedFallback ? "fallback_generated_response" : undefined,
          });

          emit({
            type: "done",
            conversationId: activeConversationId,
            userMessageId,
            assistantMessageId,
            answer,
            sources,
            confidence: retrieval.confidence,
            handoffSuggested,
          });
          controller.close();
        })().catch((error) => {
          controller.error(error);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    logSupportChatError({
      stage: "route-exception",
      ok: false,
      usedFallback: true,
      hasOpenAIKey,
      kbMatchCount: finalKbMatchCount,
      pageUrl: pageUrlForLog,
      errorMessage: error instanceof Error ? error.message : "unknown_route_error",
    });
    return NextResponse.json(fallbackResponse());
  }
}
