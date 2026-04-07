"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

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

type ConciergeConnectionState =
  | "idle"
  | "searching"
  | "connecting"
  | "connected"
  | "fallback";

type TwilioWindow = Window & {
  Twilio?: {
    Conversations?: {
      Client: {
        create: (token: string) => Promise<unknown>;
      };
    };
  };
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
  const [guestLiveToken, setGuestLiveToken] = useState<string | null>(null);
  const [handoffConnected, setHandoffConnected] = useState(false);
  const [liveChatActive, setLiveChatActive] = useState(false);
  const [showFollowUpChoice, setShowFollowUpChoice] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pathname, setPathname] = useState("");
  const [conciergeConnectionState, setConciergeConnectionState] =
    useState<ConciergeConnectionState>("idle");
  const [connectedAgentNickname, setConnectedAgentNickname] = useState("Pixie Concierge");
  const [contactSubmitStatus, setContactSubmitStatus] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [handoffForm, setHandoffForm] = useState({
    name: "",
    email: "",
    topic: "",
    phone: "",
    message: "",
  });
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const conversationPollInFlightRef = useRef(false);
  const conversationPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escalationCheckInFlightRef = useRef(false);
  const conciergeRequestInFlightRef = useRef(false);
  const joinedMessageByConversationRef = useRef(new Set<string>());

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

  function openConciergeFallbackForm() {
    setShowFollowUpChoice(false);
    setConciergeConnectionState("fallback");
    setTimeout(() => scrollToBottom("smooth"), 0);
  }

  const resetConversationState = useCallback(() => {
    setLiveChatActive(false);
    setHandoffConnected(false);
    setConversationId(null);
    setGuestLiveToken(null);
    setConnectedAgentNickname("Pixie Concierge");
    setConciergeConnectionState((prev) => (prev === "fallback" ? prev : "idle"));
  }, []);

  function playConnectingSignal() {
    try {
      const AudioCtx =
        (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 740;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch {
      // no-op
    }
  }

  async function resolveValidConversationIdForEscalation() {
    if (!conversationId || escalationCheckInFlightRef.current) {
      return conversationId;
    }

    escalationCheckInFlightRef.current = true;
    try {
      const response = await fetch(
        `/api/support/conversation?conversationId=${encodeURIComponent(conversationId)}`,
      );
      if (!response.ok) {
        resetConversationState();
        return null;
      }

      const data = (await response.json()) as {
        ok?: boolean;
        status?: string;
        handoffMode?: string | null;
      };
      const invalidConversation =
        !data?.ok || data?.status === "closed" || data?.handoffMode === "offline";
      if (invalidConversation) {
        resetConversationState();
        return null;
      }

      return conversationId;
    } catch {
      resetConversationState();
      return null;
    } finally {
      escalationCheckInFlightRef.current = false;
    }
  }

  async function initializeTwilioClient(
    nextConversationId: string,
    nextGuestLiveToken?: string | null,
  ) {
    const guestTokenQuery = nextGuestLiveToken
      ? `&guestLiveToken=${encodeURIComponent(nextGuestLiveToken)}`
      : "";
    const tokenResponse = await fetch(
      `/api/support/live/token?conversationId=${encodeURIComponent(nextConversationId)}${guestTokenQuery}`,
    );
    if (!tokenResponse.ok) {
      throw new Error("live_token_unavailable");
    }
    const tokenPayload = (await tokenResponse.json()) as { token?: string };
    if (!tokenPayload.token) {
      throw new Error("missing_live_token");
    }

    const twilioWindow = window as TwilioWindow;
    if (!twilioWindow.Twilio?.Conversations?.Client) {
      await new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById("twilio-conversations-sdk");
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("twilio_sdk_load_failed")), {
            once: true,
          });
          return;
        }
        const script = document.createElement("script");
        script.id = "twilio-conversations-sdk";
        script.src = "https://media.twiliocdn.com/sdk/js/conversations/v2.5/twilio-conversations.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("twilio_sdk_load_failed"));
        document.body.appendChild(script);
      });
    }

    if (!twilioWindow.Twilio?.Conversations?.Client) {
      throw new Error("twilio_sdk_missing");
    }

    await twilioWindow.Twilio.Conversations.Client.create(tokenPayload.token);
    setLiveChatActive(true);
  }

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!alive || !data?.user) return;
      const email = data.user.email ?? "";
      const metadataName =
        (typeof data.user.user_metadata?.full_name === "string" && data.user.user_metadata.full_name.trim()) ||
        (typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name.trim()) ||
        "";
      let profileName = "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, display_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile) {
        profileName =
          (typeof (profile as { full_name?: string | null }).full_name === "string" &&
            (profile as { full_name?: string | null }).full_name?.trim()) ||
          (typeof (profile as { display_name?: string | null }).display_name === "string" &&
            (profile as { display_name?: string | null }).display_name?.trim()) ||
          "";
      }
      const resolvedName = profileName || metadataName;
      setHandoffForm((prev) => ({
        ...prev,
        name: prev.name || resolvedName,
        email: prev.email || email,
      }));
    });
    return () => {
      alive = false;
    };
  }, []);

  function handleListScroll() {
    const container = listRef.current;
    if (!container) return;
    const nearBottom = isNearBottom(container);
    shouldStickToBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }

  const shouldPollConversation = Boolean(conversationId) && liveChatActive;

  useEffect(() => {
    if (!conversationId || !shouldPollConversation) return;
    let alive = true;
    const POLL_MS_VISIBLE = 6000;
    const POLL_MS_HIDDEN = 20000;

    const clearPollTimeout = () => {
      if (conversationPollTimeoutRef.current) {
        clearTimeout(conversationPollTimeoutRef.current);
        conversationPollTimeoutRef.current = null;
      }
    };

    const scheduleNextPoll = (delayMs: number) => {
      clearPollTimeout();
      conversationPollTimeoutRef.current = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    const nextDelayForVisibility = () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? POLL_MS_VISIBLE
        : POLL_MS_HIDDEN;

    const poll = async () => {
      if (!alive) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        scheduleNextPoll(POLL_MS_HIDDEN);
        return;
      }
      if (conversationPollInFlightRef.current) return;
      conversationPollInFlightRef.current = true;
      try {
        const response = await fetch(
          `/api/support/conversation?conversationId=${conversationId}`,
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; closed?: boolean }
            | null;
          const isTerminal =
            response.status === 400 &&
            Boolean(
              payload?.closed ||
                payload?.error === "Conversation is closed." ||
                payload?.error === "Conversation not found.",
            );
          if (alive && isTerminal) {
            resetConversationState();
          }
          if (alive) {
            scheduleNextPoll(nextDelayForVisibility());
          }
          return;
        }
        const data = await response.json();
        if (!alive || !data?.ok) {
          if (alive) {
            scheduleNextPoll(nextDelayForVisibility());
          }
          return;
        }
        const nextMessages = (data.messages ?? []).map(
          (message: {
            id: string;
            sender: "guest" | "ai" | "agent" | "system";
            content: string;
            sender_display_name?: string | null;
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
                  message.sender_display_name ||
                  (message.sender === "agent"
                    ? connectedAgentNickname
                    : message.sender === "system"
                      ? "System"
                      : "Pixie Concierge"),
              };
          },
        );
        if (nextMessages.some((msg) => msg.senderLabel === connectedAgentNickname)) {
          setHandoffConnected(true);
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
        if (alive) {
          scheduleNextPoll(nextDelayForVisibility());
        }
      } catch {
        // Keep live mode active on transient fetch failures.
        if (alive) {
          scheduleNextPoll(nextDelayForVisibility());
        }
      } finally {
        conversationPollInFlightRef.current = false;
      }
    };

    void poll();
    return () => {
      alive = false;
      clearPollTimeout();
      conversationPollInFlightRef.current = false;
    };
  }, [
    conversationId,
    shouldPollConversation,
    liveChatActive,
    connectedAgentNickname,
    resetConversationState,
  ]);

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

    const isLiveConnected =
      Boolean(conversationId) &&
      liveChatActive &&
      (handoffConnected || conciergeConnectionState === "connected");

    if (isLiveConnected) {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);
      try {
        const response = await fetch("/api/support/live/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            content: trimmed,
            guestLiveToken: guestLiveToken || undefined,
          }),
        });
        if (!response.ok) {
          throw new Error("live_message_failed");
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "All concierge are currently assisting other guests. We can follow up quickly — just leave your details.",
            senderLabel: "Pixie Concierge",
          },
        ]);
        openConciergeFallbackForm();
      } finally {
        setLoading(false);
      }
      return;
    }

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
          setGuestLiveToken(null);
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
          setGuestLiveToken(null);
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
    } catch {
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

  async function requestConcierge() {
    if (conciergeRequestInFlightRef.current) return;
    conciergeRequestInFlightRef.current = true;
    setShowFollowUpChoice(false);
    setConciergeConnectionState("searching");
    setGuestLiveToken(null);
    try {
      const startedAt = Date.now();
      const validConversationId = await resolveValidConversationIdForEscalation();
      const lastUserMessage =
        [...messages].reverse().find((msg) => msg.role === "user")?.content ||
        "";
      const response = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: validConversationId,
          guestEmail: handoffForm.email || null,
          guestName: handoffForm.name || null,
          lastUserMessage,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLiveChatActive(false);
        setHandoffConnected(false);
        const elapsed = Date.now() - startedAt;
        const waitMs = Math.max(0, 3500 - elapsed);
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        openConciergeFallbackForm();
        return;
      }
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
      setGuestLiveToken(data?.guestLiveToken ? String(data.guestLiveToken) : null);
      setHandoffConnected(Boolean(data?.assigned));
      if (data?.assigned) {
        const nickname = String(data?.agentNickname || "Pixie Concierge");
        setConnectedAgentNickname(nickname);
        setConciergeConnectionState("connecting");
        playConnectingSignal();
        if (data?.liveEnabled && data?.conversationId) {
          try {
            await initializeTwilioClient(
              data.conversationId,
              data?.guestLiveToken ? String(data.guestLiveToken) : null,
            );
            setConciergeConnectionState("connected");
            if (!joinedMessageByConversationRef.current.has(data.conversationId)) {
              joinedMessageByConversationRef.current.add(data.conversationId);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `${nickname} joined the chat.`,
                  senderLabel: "System",
                },
              ]);
            }
          } catch {
            setLiveChatActive(false);
            setHandoffConnected(false);
            const elapsed = Date.now() - startedAt;
            const waitMs = Math.max(0, 3500 - elapsed);
            if (waitMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
            openConciergeFallbackForm();
          }
        } else {
          setLiveChatActive(false);
          setHandoffConnected(false);
          const elapsed = Date.now() - startedAt;
          const waitMs = Math.max(0, 3500 - elapsed);
          if (waitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          }
          openConciergeFallbackForm();
        }
      } else {
        setLiveChatActive(false);
        setHandoffConnected(false);
        const elapsed = Date.now() - startedAt;
        const waitMs = Math.max(0, 3500 - elapsed);
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        openConciergeFallbackForm();
      }
    } catch {
      setLiveChatActive(false);
      setHandoffConnected(false);
      await new Promise((resolve) => setTimeout(resolve, 3500));
      openConciergeFallbackForm();
    } finally {
      conciergeRequestInFlightRef.current = false;
    }
  }

  async function endConversation() {
    if (!conversationId) return;
    try {
      await fetch("/api/support/conversation/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          guestLiveToken: guestLiveToken || undefined,
        }),
      });
    } catch {
      // best-effort close
    } finally {
      setLiveChatActive(false);
      setHandoffConnected(false);
      setShowFollowUpChoice(false);
      setConciergeConnectionState("idle");
      setConversationId(null);
      setGuestLiveToken(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "This conversation has been closed. Start a new message anytime.",
          senderLabel: "Pixie Concierge",
        },
      ]);
      setTimeout(() => scrollToBottom("smooth"), 0);
    }
  }

  async function submitContactFallback(event: React.FormEvent) {
    event.preventDefault();
    if (contactSubmitStatus !== "idle") return;
    setContactSubmitStatus("sending");
    try {
      const transcriptPayload = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      const response = await fetch("/api/concierge/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          name: handoffForm.name || null,
          email: handoffForm.email || null,
          topic: handoffForm.topic || null,
          message: handoffForm.phone
            ? `Phone: ${handoffForm.phone}\n${handoffForm.message}`
            : handoffForm.message,
          context: {
            transcript: transcriptPayload,
            category: category || null,
          },
          source_page: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setContactSubmitStatus("idle");
        return;
      }
      if (data?.conversationId) {
        setConversationId(data.conversationId);
        setGuestLiveToken(null);
      }
      setContactSubmitStatus("sent");
      setShowFollowUpChoice(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Your concierge request has been received. We’ll follow up soon.",
          senderLabel: "Pixie Concierge",
        },
      ]);
    } catch {
      setContactSubmitStatus("idle");
    }
  }

  const containerHeightClass =
    variant === "widget" ? "h-full min-h-0" : "h-full min-h-[520px]";
  const composerHeightClass =
    variant === "widget" ? "min-h-[168px]" : "min-h-[220px]";

  const showContactForm = conciergeConnectionState === "fallback";
  const conciergeStatusMessage =
    conciergeConnectionState === "searching"
      ? "✨ Finding an available concierge..."
      : conciergeConnectionState === "connecting"
        ? "🔔 Connecting you to a concierge..."
        : conciergeConnectionState === "connected"
          ? `👋 You’re now connected with ${connectedAgentNickname}`
          : conciergeConnectionState === "fallback"
            ? "All concierge are currently assisting other guests. We can follow up quickly — just leave your details."
            : null;

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
        {conciergeStatusMessage ? (
          <div className={`rounded-xl border px-3 py-2 text-xs ${theme.chip}`}>
            {conciergeStatusMessage}
          </div>
        ) : null}
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
                <div className="space-y-2">
                  <div className={`text-xs ${theme.muted}`}>
                    If you need help with a specific booking or account issue, you can request a concierge below.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void requestConcierge();
                    }}
                    className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
                    disabled={conciergeRequestInFlightRef.current}
                  >
                    💬 Talk to a Concierge Now
                  </button>
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
                setConciergeConnectionState("fallback");
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
                setConciergeConnectionState("idle");
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
                <span className={`text-xs ${theme.muted} mr-2`}>
                  Prefer a human?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void requestConcierge();
                  }}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
                  disabled={conciergeRequestInFlightRef.current}
                >
                  💬 Talk to a Concierge Now
                </button>
                {(handoffConnected || liveChatActive) ? (
                  <button
                    type="button"
                    onClick={() => {
                      void endConversation();
                    }}
                    className="ml-3 text-xs font-semibold text-rose-400 hover:text-rose-300"
                  >
                    End chat
                  </button>
                ) : null}
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
                    disabled={contactSubmitStatus === "sending"}
                  >
                    {contactSubmitStatus === "sent" ? "Submitted" : "Send details"}
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
