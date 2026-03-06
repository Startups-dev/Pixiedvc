import { NextResponse } from "next/server";
import { createEmbedding, createChatCompletion } from "@/lib/ai/openai";
import { createServiceClient } from "@/lib/supabase-service-client";
import {
  buildExcerpt,
  buildSupportContext,
  scoreSupportMatches,
  type SupportMatch,
} from "@/lib/support/retrieval";
import { buildSupportSystemPrompt } from "@/lib/support/prompt";

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
  supabase: ReturnType<typeof createServiceClient>,
  query: string,
  selectedCategory: string,
  logBase: Pick<SupportChatDebugLog, "hasOpenAIKey" | "pageUrl">,
) {
  let embedding: number[];
  try {
    embedding = await createEmbedding(query);
    logSupportChatDebug({
      stage: "embedding",
      ok: true,
      usedFallback: false,
      hasOpenAIKey: logBase.hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: logBase.pageUrl,
    });
  } catch (error) {
    logSupportChatError({
      stage: "embedding",
      ok: false,
      usedFallback: true,
      hasOpenAIKey: logBase.hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: logBase.pageUrl,
      errorMessage: error instanceof Error ? error.message : "unknown_embedding_error",
    });
    logSupportChatBranch("fallback:embedding-failed", {
      ok: false,
      usedFallback: true,
      hasOpenAIKey: logBase.hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: logBase.pageUrl,
      errorMessage: error instanceof Error ? error.message : "unknown_embedding_error",
    });
    if (!logBase.hasOpenAIKey) {
      logSupportChatBranch("fallback:no-openai-key", {
        ok: false,
        usedFallback: true,
        hasOpenAIKey: false,
        kbMatchCount: 0,
        pageUrl: logBase.pageUrl,
        errorMessage: "openai_key_missing",
      });
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("match_support_kb_documents", {
    query_embedding: embedding,
    match_count: 6,
    min_similarity: 0.72,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    logSupportChatDebug({
      stage: "semantic-retrieval",
      ok: !error,
      usedFallback: true,
      hasOpenAIKey: logBase.hasOpenAIKey,
      kbMatchCount: Array.isArray(data) ? data.length : 0,
      pageUrl: logBase.pageUrl,
      errorMessage: error?.message,
    });
    return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
  }

  let docs = (data as SupportDoc[]).filter((doc) => Boolean(doc?.content));
  if (selectedCategory) {
    docs = docs.filter((doc) => doc.category === selectedCategory);
  }

  const matches: SupportMatch[] = docs.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    content: doc.content,
    similarity: doc.similarity ?? 0,
  }));
  const scored = scoreSupportMatches(matches, 0.72);

  logSupportChatDebug({
    stage: "semantic-retrieval",
    ok: true,
    usedFallback: scored.matches.length === 0,
    hasOpenAIKey: logBase.hasOpenAIKey,
    kbMatchCount: scored.matches.length,
    pageUrl: logBase.pageUrl,
  });

  return {
    docs: scored.matches as SupportDoc[],
    confidence: scored.confidence,
    handoffSuggested: scored.handoffSuggested,
  };
}

function buildSources(docs: SupportDoc[]): SupportSource[] {
  return docs.slice(0, 3).map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    excerpt: buildExcerpt(doc.content),
  }));
}

export async function POST(request: Request) {
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  let pageUrlForLog: string | null = null;
  let finalKbMatchCount = 0;
  let usedFallback = false;

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

    const supabase = createServiceClient();
    const query = lastMessage.content.trim();
    const context = derivePageContext(pageUrl);

    let activeConversationId = conversationId;
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
        usedFallback = true;
        logSupportChatError({
          stage: "conversation-persistence",
          ok: false,
          usedFallback,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: conversationError?.message ?? "conversation_create_failed",
        });
        logSupportChatBranch("fallback:conversation-persistence-failed", {
          ok: false,
          usedFallback: true,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: conversationError?.message ?? "conversation_create_failed",
        });
        return NextResponse.json(fallbackResponse());
      }
      activeConversationId = conversation.id;
      logSupportChatDebug({
        stage: "conversation-persistence",
        ok: true,
        usedFallback: false,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
      });
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

    logSupportChatDebug({
      stage: "message-persistence-user",
      ok: Boolean(userMessageRow?.id),
      usedFallback: false,
      hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: pageUrlForLog,
      errorMessage: userMessageRow?.id ? undefined : "user_message_insert_not_returned",
    });

    let retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
    try {
      retrieval = await semanticRetrieve(supabase, query, selectedCategory, {
        hasOpenAIKey,
        pageUrl: pageUrlForLog,
      });
    } catch (error) {
      usedFallback = true;
      logSupportChatError({
        stage: "semantic-retrieval",
        ok: false,
        usedFallback,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: error instanceof Error ? error.message : "semantic_retrieval_failed",
      });
      retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
    }
    if (retrieval.docs.length === 0) {
      usedFallback = true;
      retrieval = await keywordRetrieve(supabase, query, selectedCategory);
      logSupportChatDebug({
        stage: "keyword-retrieval",
        ok: true,
        usedFallback,
        hasOpenAIKey,
        kbMatchCount: retrieval.docs.length,
        pageUrl: pageUrlForLog,
      });
    }
    finalKbMatchCount = retrieval.docs.length;

    const sources = buildSources(retrieval.docs);

    let answer = "";
    try {
      if (retrieval.docs.length === 0) {
        usedFallback = true;
        const fallback = fallbackResponse();
        answer = fallback.answer;
        logSupportChatBranch("fallback:no-kb-match", {
          ok: false,
          usedFallback: true,
          hasOpenAIKey,
          kbMatchCount: finalKbMatchCount,
          pageUrl: pageUrlForLog,
          errorMessage: "no_kb_match",
        });
        logSupportChatDebug({
          stage: "chat-completion",
          ok: false,
          usedFallback,
          hasOpenAIKey,
          kbMatchCount: finalKbMatchCount,
          pageUrl: pageUrlForLog,
          errorMessage: "no_kb_docs_for_completion",
        });
      } else {
        const contextBlock = [
          `Route type: ${context.routeType}`,
          context.path ? `Path: ${context.path}` : "",
          context.resortSlug ? `Resort slug: ${context.resortSlug}` : "",
          selectedCategory ? `Selected category: ${selectedCategory}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const kbContext = buildSupportContext(
          retrieval.docs.map((doc) => ({
            slug: doc.slug,
            title: doc.title,
            category: doc.category,
            content: doc.content,
            similarity: doc.similarity ?? 0,
          })),
        );

        logSupportChatDebug({
          stage: "chat-completion",
          ok: true,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: finalKbMatchCount,
          pageUrl: pageUrlForLog,
        });

        answer = await createChatCompletion({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: buildSupportSystemPrompt(),
            },
            {
              role: "system",
              content: `Current page context:\n${contextBlock}`,
            },
            {
              role: "system",
              content: `Knowledge sources:\n${kbContext}`,
            },
            ...messages.slice(-8).map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
        });
        if (!answer.trim()) {
          logSupportChatBranch("fallback:empty-model-response", {
            ok: false,
            usedFallback: true,
            hasOpenAIKey,
            kbMatchCount: finalKbMatchCount,
            pageUrl: pageUrlForLog,
            errorMessage: "empty_model_response",
          });
        } else {
          logSupportChatBranch("success:ai-response", {
            ok: true,
            usedFallback,
            hasOpenAIKey,
            kbMatchCount: finalKbMatchCount,
            pageUrl: pageUrlForLog,
          });
        }

        logSupportChatDebug({
          stage: "chat-completion-result",
          ok: true,
          usedFallback,
          hasOpenAIKey,
          kbMatchCount: finalKbMatchCount,
          pageUrl: pageUrlForLog,
        });
      }
    } catch (error) {
      usedFallback = true;
      logSupportChatBranch("fallback:chat-completion-failed", {
        ok: false,
        usedFallback: true,
        hasOpenAIKey,
        kbMatchCount: finalKbMatchCount,
        pageUrl: pageUrlForLog,
        errorMessage: error instanceof Error ? error.message : "chat_completion_failed",
      });
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("missing content")
      ) {
        logSupportChatBranch("fallback:empty-model-response", {
          ok: false,
          usedFallback: true,
          hasOpenAIKey,
          kbMatchCount: finalKbMatchCount,
          pageUrl: pageUrlForLog,
          errorMessage: error.message,
        });
      }
      logSupportChatError({
        stage: "chat-completion-result",
        ok: false,
        usedFallback,
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
    }

    const handoffSuggested =
      retrieval.docs.length === 0 ? true : retrieval.handoffSuggested || retrieval.confidence === "medium";

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

    logSupportChatDebug({
      stage: "message-persistence-assistant",
      ok: Boolean(assistantMessageRow?.id),
      usedFallback,
      hasOpenAIKey,
      kbMatchCount: finalKbMatchCount,
      pageUrl: pageUrlForLog,
      errorMessage: assistantMessageRow?.id ? undefined : "assistant_message_insert_not_returned",
    });

    logSupportChatDebug({
      stage: "final-response",
      ok: true,
      usedFallback,
      hasOpenAIKey,
      kbMatchCount: finalKbMatchCount,
      pageUrl: pageUrlForLog,
      errorMessage: usedFallback ? "fallback_generated_response" : undefined,
    });

    return NextResponse.json({
      conversationId: activeConversationId,
      userMessageId: userMessageRow?.id ?? null,
      assistantMessageId: assistantMessageRow?.id ?? null,
      answer,
      sources,
      confidence: retrieval.confidence,
      handoffSuggested,
    });
  } catch (error) {
    if (!hasOpenAIKey) {
      logSupportChatBranch("fallback:no-openai-key", {
        ok: false,
        usedFallback: true,
        hasOpenAIKey: false,
        kbMatchCount: finalKbMatchCount,
        pageUrl: pageUrlForLog,
        errorMessage: "openai_key_missing",
      });
    }
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
