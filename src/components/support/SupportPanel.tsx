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
      muted: "text-slate-600",
      chip: "bg-slate-50 border-slate-200 text-slate-600",
      button:
        "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400",
    };
  }, [variant]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

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

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const nextMessages: SupportMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          category: category || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "Sorry, something went wrong.",
          sources: data.sources ?? [],
          handoffSuggested: Boolean(data.handoffSuggested),
          senderLabel: "Pixie Concierge",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "That’s a great question. Let me connect you with a Pixie Concierge who can help with this ✨",
          handoffSuggested: true,
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
    variant === "widget" ? "h-[110px]" : "min-h-[220px]";

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
                  You can request a concierge below.
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
          <div className={`text-xs ${theme.muted}`}>Thinking...</div>
        )}
      </div>

      <div className={`border-t px-5 pb-2 pt-1 ${theme.header}`}>
        <div className={`relative ${composerHeightClass}`}>
          <div
            data-active={!showContactForm}
            className="absolute inset-0 transition-[opacity,transform] duration-140 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] data-[active=true]:opacity-100 data-[active=true]:translate-y-0 data-[active=true]:pointer-events-auto data-[active=false]:opacity-0 data-[active=false]:translate-y-1 data-[active=false]:pointer-events-none"
          >
            <div className="flex h-full flex-col justify-end gap-1.5">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything DVC..."
                className={`no-scrollbar mt-auto h-9 w-full resize-none overflow-hidden rounded-xl border px-3 py-0 text-sm leading-[2.25rem] ${theme.input}`}
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={requestConcierge}
                  className={`text-xs font-semibold ${theme.muted}`}
                  disabled={handoffStatus === "sending"}
                >
                  Talk to a Concierge
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${theme.button}`}
                >
                  Send
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
