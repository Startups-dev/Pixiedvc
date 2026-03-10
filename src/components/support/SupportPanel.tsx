"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SupportSource = {
  slug: string;
  title: string;
  category: string;
  excerpt?: string;
};

type SupportMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  senderLabel?: string;
  sources?: SupportSource[];
  handoffSuggested?: boolean;
  action?: "followup-choice";
};

type SupportPanelProps = {
  categories?: string[];
  variant?: "light" | "dark" | "widget";
  className?: string;
};

type SupportChatStreamEvent = {
  type?: "start" | "chunk" | "done";
  text?: string;
  answer?: string;
  conversationId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  sources?: SupportSource[];
  handoffSuggested?: boolean;
};

const initialMessage: SupportMessage = {
  role: "assistant",
  content: "Hi 👋 I’m your Pixie Concierge. How can I help with your plans today?",
  senderLabel: "Pixie Concierge",
};

export default function SupportPanel({
  categories = [],
  variant = "light",
  className = "",
}: SupportPanelProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [handoffConnected, setHandoffConnected] = useState(false);
  const [noAgentAvailable, setNoAgentAvailable] = useState(false);
  const [showFollowUpChoice, setShowFollowUpChoice] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pathname, setPathname] = useState("");
  const [handoffStatus, setHandoffStatus] = useState<
    "idle" | "sending" | "sent"
  >("idle");
  const [handoffForm, setHandoffForm] = useState({
    name: "",
    email: "",
    topic: "",
    phone: "",
    message: "",
  });
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const isNearBottom = (container: HTMLDivElement) =>
    container.scrollHeight - container.scrollTop - container.clientHeight < 100;

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior,
    });
    shouldStickToBottomRef.current = true;
    setShowScrollButton(false);
  };

  const theme = useMemo(() => {
    if (variant === "dark" || variant === "widget") {
      return {
        container: "border-slate-800 bg-slate-900 text-slate-100",
        header: "border-slate-800",
        assistantBubble: "bg-slate-800/70 text-slate-100",
        userBubble: "bg-slate-700 text-white",
        input:
          "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-400",
        muted: "text-slate-300",
        chip: "bg-slate-800 border-slate-700 text-slate-200",
        button:
          "bg-slate-100 text-slate-900 hover:bg-white focus-visible:ring-slate-300",
      };
    }
    return {
      container: "border-slate-200 bg-white text-slate-900 shadow-sm",
      header: "border-slate-200",
      assistantBubble: "bg-slate-100 text-slate-900",
      userBubble: "bg-slate-900 text-white",
      input:
        "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
      muted: "text-slate-500",
      chip: "bg-slate-50 border-slate-200 text-slate-500",
      button:
        "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400",
    };
  }, [variant]);

  const suggestionChips = useMemo(() => {
    if (pathname.startsWith("/resorts/")) {
      return [
        "Compare rooms",
        "How far is this from Magic Kingdom?",
        "What villas are available here?",
      ];
    }
    if (pathname.startsWith("/calculator")) {
      return [
        "How are points calculated?",
        "What happens after I submit?",
        "How does booking work?",
      ];
    }
    if (pathname.startsWith("/owner")) {
      return [
        "How do I rent my points?",
        "How does owner verification work?",
        "Owner onboarding steps",
      ];
    }
    return [
      "What is DVC point rental?",
      "What are Ready Stays?",
      "How does booking work?",
      "Compare resorts",
    ];
  }, [pathname]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    if (shouldStickToBottomRef.current || isNearBottom(container)) {
      scrollToBottom("smooth");
      return;
    }
    setShowScrollButton(true);
  }, [messages, loading]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPathname(window.location.pathname);
  }, []);

  function handleListScroll() {
    const container = listRef.current;
    if (!container) return;
    const nearBottom = isNearBottom(container);
    shouldStickToBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }

  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/support/conversation?conversationId=${conversationId}`,
        );
        const data = await response.json();
        if (!alive || !data?.ok) return;
        const nextMessages = (data.messages ?? []).map(
          (message: {
            id: string;
            sender: "guest" | "ai" | "agent";
            content: string;
          }) => {
            if (message.sender === "guest") {
              return {
                id: message.id,
                role: "user" as const,
                content: message.content,
              };
            }
              return {
                id: message.id,
                role: "assistant" as const,
                content: message.content,
                senderLabel:
                  message.sender === "agent"
                    ? "Concierge"
                    : "Pixie Concierge",
              };
          },
        );
        if (nextMessages.some((msg) => msg.senderLabel === "Concierge")) {
          setHandoffConnected(true);
          setNoAgentAvailable(false);
        }
        setMessages((prev) => {
          const seen = new Set(prev.map((msg) => msg.id).filter(Boolean));
          const merged = [...prev];
          nextMessages.forEach((msg) => {
            if (!msg.id || !seen.has(msg.id)) {
              merged.push(msg);
            }
          });
          return merged;
        });
      } catch (error) {
        // ignore polling errors
      }
    };
    const interval = setInterval(poll, 4000);
    void poll();
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [conversationId]);

  function buildClientFallbackAnswer(
    query: string,
    previousUserMessage: string | null = null,
  ) {
    const normalized = query.toLowerCase();
    const frustrationSignals = [
      "did you understand",
      "i just told you",
      "as i said",
      "like i said",
      "same thing",
    ];
    const isFrustration = frustrationSignals.some((signal) =>
      normalized.includes(signal),
    );
    const resolvedQuery =
      isFrustration && previousUserMessage
        ? previousUserMessage.toLowerCase()
        : normalized;

    if (
      resolvedQuery.includes("dining plan") ||
      resolvedQuery.includes("disney dining plan")
    ) {
      return "Disney Dining Plans are not typically added directly by guests on DVC reservations. The owner can usually request/add the plan through Disney Vacation Club Member Services, PixieDVC can coordinate that request, it may require valid payment information, and PixieDVC does not charge a service fee for coordinating it.";
    }
    if (
      resolvedQuery.includes("dvc") ||
      resolvedQuery.includes("disney vacation club") ||
      resolvedQuery.includes("point rental") ||
      resolvedQuery.includes("points")
    ) {
      return "Disney Vacation Club point rental allows guests to stay at DVC resorts using a member’s points instead of booking Disney’s standard cash rate directly.";
    }
    if (
      resolvedQuery.includes("magic kingdom")
    ) {
      return "For Magic Kingdom convenience, start with Bay Lake Tower, Polynesian Villas, and Grand Floridian Villas.";
    }
    if (resolvedQuery.includes("epcot")) {
      return "For EPCOT access, top options are Beach Club, BoardWalk, and Riviera.";
    }
    if (
      resolvedQuery.includes("ocean") ||
      resolvedQuery.includes("beach")
    ) {
      return "For ocean-style stays, shortlist Aulani, Hilton Head, and Vero Beach.";
    }
    if (
      resolvedQuery.includes("quiet") ||
      resolvedQuery.includes("relaxing")
    ) {
      return "For a quieter pace, consider Old Key West, Saratoga Springs, and Kidani Village.";
    }
    if (
      resolvedQuery.includes("couples") ||
      resolvedQuery.includes("romantic")
    ) {
      return "For couples, strong picks are Riviera, Grand Floridian Villas, and Polynesian Villas.";
    }
    if (
      resolvedQuery.includes("family-friendly") ||
      resolvedQuery.includes("family friendly") ||
      resolvedQuery.includes("family") ||
      resolvedQuery.includes("kids")
    ) {
      return "For family-friendly stays, start with Beach Club, Polynesian Villas, and Bay Lake Tower.";
    }
    if (
      resolvedQuery.includes("compare resort") ||
      resolvedQuery.includes("compare resorts")
    ) {
      return "A quick shortlist by trip style: Beach Club and BoardWalk for EPCOT convenience, Polynesian and Bay Lake Tower for easier Magic Kingdom access, and Riviera for a polished Skyliner-centered stay.";
    }
    if (
      resolvedQuery.includes("how much") ||
      resolvedQuery.includes("cost") ||
      resolvedQuery.includes("price") ||
      resolvedQuery.includes("pricing") ||
      resolvedQuery.includes("what affects") ||
      resolvedQuery.includes("cheaper") ||
      resolvedQuery.includes("value")
    ) {
      return "Total cost depends on resort, dates, room type, trip length, and required points. The calculator is the best way to get a trip-specific estimate.";
    }
    if (
      resolvedQuery.includes("do i pay all upfront") ||
      resolvedQuery.includes("when do i pay") ||
      resolvedQuery.includes("balance due") ||
      resolvedQuery.includes("payment plan") ||
      resolvedQuery.includes("payment") ||
      resolvedQuery.includes("deposit")
    ) {
      return "Payment timing depends on how far out the trip is. More than 90 days before check-in is typically split 70% at booking and 30% due no later than 90 days before check-in. Within 90 days, full payment is typically required at booking.";
    }
    if (
      resolvedQuery.includes("booking") ||
      resolvedQuery.includes("request") ||
      resolvedQuery.includes("reservation") ||
      resolvedQuery.includes("deposit")
    ) {
      return "Booking usually starts with trip details and then moves through request review, agreement, and confirmation steps.";
    }
    if (
      resolvedQuery.includes("ready stay") ||
      resolvedQuery.includes("ready stays")
    ) {
      return "Ready Stays are pre-confirmed reservation options that can often be booked faster than a custom request.";
    }
    return "I can help explain that. Share a bit more about what you want to understand, and I’ll walk you through it.";
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const pendingId = `pending-assistant-${Date.now()}`;
    const requestMessages: SupportMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    const nextMessages: SupportMessage[] = [
      ...requestMessages,
      {
        id: pendingId,
        role: "assistant",
        content: "",
        senderLabel: "Pixie Concierge",
      },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages,
          conversationId,
          category: category || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      if (!response.ok) {
        throw new Error(`support_chat_failed_${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const isNdjson = contentType.includes("application/x-ndjson");
      if (!isNdjson || !response.body) {
        const data = await response.json();
        if (data?.conversationId) {
          setConversationId(data.conversationId);
        }
        setMessages((prev) =>
          prev
            .map((message, index) => {
              if (
                data?.userMessageId &&
                !message.id &&
                message.role === "user" &&
                message.content === trimmed &&
                index === prev.length - 2
              ) {
                return { ...message, id: data.userMessageId as string };
              }
              return message;
            })
            .map((message) =>
              message.id === pendingId
                ? {
                    ...message,
                    id: data?.assistantMessageId ?? pendingId,
                    content: data.answer ?? "Sorry, something went wrong.",
                    sources: data.sources ?? [],
                    handoffSuggested: Boolean(data.handoffSuggested),
                  }
                : message,
            ),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";

      const applyEvent = (event: SupportChatStreamEvent) => {
        if (event.conversationId) {
          setConversationId(event.conversationId);
        }

        setMessages((prev) =>
          prev
            .map((message, index) => {
              if (
                event.userMessageId &&
                !message.id &&
                message.role === "user" &&
                message.content === trimmed &&
                index === prev.length - 2
              ) {
                return { ...message, id: event.userMessageId };
              }
              return message;
            })
            .map((message) => {
              if (message.id !== pendingId) return message;
              if (event.type === "chunk") {
                streamedText += event.text ?? "";
                return { ...message, content: streamedText };
              }
              if (event.type === "done") {
                return {
                  ...message,
                  id: event.assistantMessageId ?? pendingId,
                  content:
                    event.answer ?? (streamedText || "Sorry, something went wrong."),
                  sources: event.sources ?? [],
                  handoffSuggested: Boolean(event.handoffSuggested),
                };
              }
              return message;
            }),
        );
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const nextLine = line.trim();
          if (!nextLine) continue;
          const event = JSON.parse(nextLine) as SupportChatStreamEvent;
          applyEvent(event);
        }
      }

      if (buffer.trim()) {
        const event = JSON.parse(buffer.trim()) as SupportChatStreamEvent;
        applyEvent(event);
      }
    } catch (error) {
      const previousUserMessage =
        [...requestMessages]
          .slice(0, -1)
          .reverse()
          .find((message) => message.role === "user")?.content ?? null;
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== pendingId),
        {
          role: "assistant",
          content: buildClientFallbackAnswer(trimmed, previousUserMessage),
          handoffSuggested: false,
          senderLabel: "Pixie Concierge",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function submitHandoff(event: React.FormEvent) {
    event.preventDefault();
    if (handoffStatus !== "idle") return;
    setHandoffStatus("sending");

    try {
      const lastUserMessage =
        handoffForm.message ||
        [...messages].reverse().find((msg) => msg.role === "user")?.content ||
        "";
      const response = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          guestEmail: handoffForm.email || null,
          lastUserMessage,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await response.json();
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
      setHandoffConnected(Boolean(data?.assigned));
      setNoAgentAvailable(Boolean(data?.noAgentAvailable));
      setHandoffStatus("sent");
    } catch (error) {
      setHandoffStatus("idle");
    }
  }

  async function requestConcierge() {
    setHandoffStatus("sending");
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "✨ Let me check if a Pixie Concierge is available…",
        senderLabel: "Pixie Concierge",
      },
    ]);
    try {
      const lastUserMessage =
        [...messages].reverse().find((msg) => msg.role === "user")?.content ||
        "";
      const response = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          guestEmail: handoffForm.email || null,
          lastUserMessage,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNoAgentAvailable(true);
        setHandoffConnected(false);
        setShowFollowUpChoice(true);
        setShowContactForm(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "✨ Our concierge desk is busy at the moment. Would you like us to follow up with you shortly?",
            senderLabel: "Pixie Concierge",
            action: "followup-choice",
          },
        ]);
        setHandoffStatus("idle");
        return;
      }
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
      setHandoffConnected(Boolean(data?.assigned));
      setNoAgentAvailable(Boolean(data?.noAgentAvailable));
      if (data?.assigned) {
        setShowFollowUpChoice(false);
        setShowContactForm(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "You’re connected to a Pixie Concierge. They’ll reply here shortly.",
            senderLabel: "Pixie Concierge",
          },
        ]);
      } else {
        setShowFollowUpChoice(true);
        setShowContactForm(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "✨ Our concierge desk is busy at the moment. Would you like us to follow up with you shortly?",
            senderLabel: "Pixie Concierge",
            action: "followup-choice",
          },
        ]);
      }
      setHandoffStatus("idle");
    } catch (error) {
      setNoAgentAvailable(true);
      setHandoffConnected(false);
      setShowFollowUpChoice(true);
      setShowContactForm(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "✨ Our concierge desk is busy at the moment. Would you like us to follow up with you shortly?",
          senderLabel: "Pixie Concierge",
          action: "followup-choice",
        },
      ]);
      setHandoffStatus("idle");
    }
  }

  async function submitContactFallback(event: React.FormEvent) {
    event.preventDefault();
    if (handoffStatus !== "idle") return;
    setHandoffStatus("sending");
    try {
      const transcriptPayload = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      const response = await fetch("/api/support/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: handoffForm.name || null,
          email: handoffForm.email || null,
          topic: handoffForm.topic || null,
          message: handoffForm.phone
            ? `Phone: ${handoffForm.phone}\n${handoffForm.message}`
            : handoffForm.message,
          transcript: transcriptPayload,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setHandoffStatus("idle");
        return;
      }
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
      setHandoffStatus("sent");
      setShowContactForm(false);
      setShowFollowUpChoice(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Thanks! A Pixie Concierge will follow up shortly.",
          senderLabel: "Pixie Concierge",
        },
      ]);
    } catch (error) {
      setHandoffStatus("idle");
    }
  }

  const containerHeightClass =
    variant === "widget" ? "h-full min-h-0" : "h-full min-h-[520px]";
  const composerHeightClass =
    variant === "widget" ? "min-h-[168px]" : "min-h-[220px]";

  return (
    <div
      className={`relative flex ${containerHeightClass} flex-col rounded-2xl border ${theme.container} ${className}`}
    >
      <div
        className={`flex items-center justify-between border-b px-5 py-4 ${theme.header}`}
      >
        <div>
          <p className="text-sm font-semibold">✨ Pixie Concierge</p>
          <p className={`text-xs ${theme.muted}`}>Turning dreams into plans</p>
        </div>
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={`rounded-lg border px-2 py-1 text-xs ${theme.chip}`}
          >
            <option value="">All topics</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={handleListScroll}
        className="pixie-scrollbar flex-1 min-h-0 space-y-4 overflow-y-auto px-5 py-4"
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div key={`${message.role}-${index}`} className="space-y-2">
              <div
                className={`w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser ? theme.userBubble : theme.assistantBubble
                } ${isUser ? "ml-auto" : ""}`}
              >
                {!isUser && message.senderLabel && (
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {message.senderLabel}
                  </div>
                )}
                {message.content}
              </div>
              {!isUser && message.sources && message.sources.length > 0 && (
                <div className={`text-xs ${theme.muted}`}>
                  Sources:{" "}
                  {message.sources.map((source) => source.title).join(", ")}
                </div>
              )}
              {!isUser && message.handoffSuggested && (
                <div className={`text-xs ${theme.muted}`}>
                  If you need help with a specific booking or account issue, you can request a concierge below.
                </div>
              )}
            </div>
          );
        })}
        {showFollowUpChoice && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowContactForm(true);
                setShowFollowUpChoice(false);
              }}
              className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100"
            >
              Yes, please
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFollowUpChoice(false);
                setShowContactForm(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: "No problem. I’m here if you need anything else.",
                    senderLabel: "Pixie Concierge",
                  },
                ]);
              }}
              className="rounded-full border border-slate-700 bg-transparent px-3 py-1 text-xs font-semibold text-slate-300"
            >
              No, thanks
            </button>
          </div>
        )}
        {loading && (
          <div className={`text-xs ${theme.muted}`}>
            Pixie Concierge is typing...
          </div>
        )}
      </div>
      {showScrollButton && (
        <div className="pointer-events-none absolute bottom-[122px] left-0 right-0 z-10 flex justify-center px-5">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1 text-xs font-semibold text-slate-100 shadow-lg"
          >
            New message ↓
          </button>
        </div>
      )}

      <div className={`border-t px-5 pb-2 pt-1 ${theme.header}`}>
        <div className={`relative ${composerHeightClass}`}>
          <div
            data-active={!showContactForm}
            className="absolute inset-0 transition-[opacity,transform] duration-140 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] data-[active=true]:opacity-100 data-[active=true]:translate-y-0 data-[active=true]:pointer-events-auto data-[active=false]:opacity-0 data-[active=false]:translate-y-1 data-[active=false]:pointer-events-none"
          >
            <div className="flex h-full flex-col justify-end gap-2 pb-1">
              <div className="flex flex-wrap gap-2">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setInput(chip)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${theme.chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything DVC..."
                  className={`no-scrollbar h-10 min-w-0 flex-1 resize-none overflow-hidden rounded-xl border px-3 py-2 text-sm leading-5 ${theme.input}`}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${theme.button}`}
                >
                  Send
                </button>
              </div>
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={requestConcierge}
                  className={`text-xs font-semibold ${theme.muted}`}
                  disabled={handoffStatus === "sending"}
                >
                  Talk to a Concierge
                </button>
              </div>
            </div>
          </div>

          <div
            data-active={showContactForm}
            className="absolute inset-0 transition-[opacity,transform] duration-140 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] data-[active=true]:opacity-100 data-[active=true]:translate-y-0 data-[active=true]:pointer-events-auto data-[active=false]:opacity-0 data-[active=false]:translate-y-1 data-[active=false]:pointer-events-none"
          >
            <div className="h-full overflow-y-auto pr-1">
              <h3 className="text-sm font-semibold text-slate-200">
                Share a few details and we’ll follow up.
              </h3>
              <form onSubmit={submitContactFallback} className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  value={handoffForm.name}
                  onChange={(event) =>
                    setHandoffForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  value={handoffForm.email}
                  onChange={(event) =>
                    setHandoffForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  value={handoffForm.phone}
                  onChange={(event) =>
                    setHandoffForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
                <textarea
                  rows={2}
                  placeholder="How can we help?"
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  value={handoffForm.message}
                  onChange={(event) =>
                    setHandoffForm((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900"
                    disabled={handoffStatus === "sending"}
                  >
                    {handoffStatus === "sent" ? "Submitted" : "Send details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
