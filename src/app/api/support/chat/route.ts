import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { buildExcerpt } from "@/lib/support/retrieval";

type SupportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function fallbackResponse() {
  return {
    answer:
      "I’m not fully sure from our help docs yet. If you’d like, I can connect you with a concierge for a precise answer.",
    sources: [],
    confidence: "low",
    handoffSuggested: true,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = (body?.messages ?? []) as SupportChatMessage[];
    const lastMessage = messages[messages.length - 1];
    const selectedCategory = body?.category ? String(body.category) : "";

    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const query = lastMessage.content.trim();
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);

    const orParts = [
      `title.ilike.%${query}%`,
      `content.ilike.%${query}%`,
    ];
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
      return NextResponse.json(fallbackResponse());
    }

    let matches = data;
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
        return { ...doc, score };
      })
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (!top || top.score < 2) {
      return NextResponse.json(fallbackResponse());
    }

    const sentences = top.content
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");

    const answer =
      sentences ||
      "Based on our help docs, here’s what we can share. If you need anything specific, I can connect you with concierge.";

    const sources = scored.slice(0, 3).map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      excerpt: buildExcerpt(doc.content),
    }));

    const confidence = top.score >= 6 ? "high" : "medium";

    return NextResponse.json({
      answer,
      sources,
      confidence,
      handoffSuggested: confidence === "medium",
    });
  } catch (error) {
    return NextResponse.json(fallbackResponse());
  }
}
