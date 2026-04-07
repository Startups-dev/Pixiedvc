"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Dot, MoreHorizontal, Send, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase";

type InboxFilter = "all" | "unassigned" | "mine";
type ComposerMode = "public" | "internal";

type HandoffRow = {
  conversation_id: string;
  status: "open" | "claimed" | "resolved";
  created_at: string;
  assigned_agent_user_id: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  last_sender?: string | null;
  conversation?: {
    status?: string | null;
    handoff_mode?: string | null;
    guest_name?: string | null;
    guest_email?: string | null;
    topic?: string | null;
    updated_at?: string | null;
  } | null;
};

type SupportMessage = {
  id: string;
  sender: "guest" | "ai" | "agent" | "system" | string;
  content: string;
  created_at: string;
  sender_display_name?: string | null;
};

type AgentInboxResponse = {
  ok?: boolean;
  assigned?: HandoffRow[];
  queue?: HandoffRow[];
};

type AgentOnlineStatus = {
  ok?: boolean;
  isOnline?: boolean;
  canReceiveLiveChats?: boolean;
  openChats?: number;
  maxConcurrent?: number;
};

type QueueCard = {
  id: string;
  customerName: string;
  customerEmail: string;
  waitingMinutes: number;
  topic: string;
  preview: string;
  badge: "AI handoff" | "Waiting" | "Agent replied";
  assignedToMe: boolean;
  unassigned: boolean;
  createdAt: string;
  status: string;
  lastMessageAt: string | null;
};

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  at: string;
};

const MESSAGE_DUMMY: SupportMessage[] = [
  {
    id: "m1",
    sender: "guest",
    content: "Hi, I need help choosing between Riviera and Beach Club for a relaxing trip.",
    created_at: new Date(Date.now() - 7 * 60_000).toISOString(),
    sender_display_name: "Guest",
  },
  {
    id: "m2",
    sender: "ai",
    content: "I can help with that. Riviera is modern with Skyliner access, while Beach Club is walkable to EPCOT with a standout pool.",
    created_at: new Date(Date.now() - 6 * 60_000).toISOString(),
    sender_display_name: "Pixie Concierge",
  },
  {
    id: "m3",
    sender: "guest",
    content: "We care most about EPCOT access and a calmer vibe.",
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    sender_display_name: "Guest",
  },
];

const CONTEXT_DUMMY: TimelineEvent[] = [
  {
    id: "t1",
    label: "AI handoff",
    detail: "Conversation moved from AI assistant to concierge queue.",
    at: new Date(Date.now() - 7 * 60_000).toISOString(),
  },
  {
    id: "t2",
    label: "Guest message",
    detail: "Asked for resort comparison near EPCOT.",
    at: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
];

function minutesSince(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.round((Date.now() - time) / 60_000));
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "just now";
  const mins = minutesSince(iso);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h`;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toQueueCard(row: HandoffRow, userId: string | null): QueueCard {
  const assignedToMe = Boolean(userId) && row.assigned_agent_user_id === userId;
  const unassigned = !row.assigned_agent_user_id;
  const waitingMinutes = minutesSince(row.created_at);
  const customerName = row.conversation?.guest_name?.trim() || row.conversation?.guest_email?.trim() || "Guest";
  const customerEmail = row.conversation?.guest_email?.trim() || "No email";
  const topic = row.conversation?.topic?.trim() || row.conversation?.handoff_mode?.trim() || "General support";
  const preview = row.last_message_preview?.trim() || "No message yet";

  let badge: QueueCard["badge"] = "Waiting";
  if (row.last_sender === "agent") badge = "Agent replied";
  else if (row.last_sender === "ai") badge = "AI handoff";

  return {
    id: row.conversation_id,
    customerName,
    customerEmail,
    waitingMinutes,
    topic,
    preview,
    badge,
    assignedToMe,
    unassigned,
    createdAt: row.created_at,
    status: row.status,
    lastMessageAt: row.last_message_at ?? null,
  };
}

function composeAiSummary(messages: SupportMessage[]) {
  const guestLatest = [...messages].reverse().find((m) => m.sender === "guest")?.content || "Guest needs planning support.";
  const suggestion =
    guestLatest.toLowerCase().includes("price") || guestLatest.toLowerCase().includes("cost")
      ? "Confirm travel dates and room type, then explain pricing factors and next booking step."
      : guestLatest.toLowerCase().includes("compare") || guestLatest.toLowerCase().includes("resort")
        ? "Provide a 2-4 resort shortlist with reasons, then ask one narrowing question."
        : "Acknowledge the request, confirm key details, and provide a concise next step.";
  return {
    intent: guestLatest,
    suggestedNext: suggestion,
  };
}

function isInternalNote(message: SupportMessage) {
  return (
    message.sender === "internal_note" ||
    message.sender === "system" ||
    message.content.trim().toLowerCase().startsWith("[internal note]")
  );
}

function groupedMessages(messages: SupportMessage[]) {
  const groups: Array<{ key: string; sender: string; display: string; internal: boolean; items: SupportMessage[] }> = [];
  for (const msg of messages) {
    const internal = isInternalNote(msg);
    const sender = internal ? "internal" : msg.sender;
    const display = internal
      ? "Internal note"
      : msg.sender_display_name || (msg.sender === "ai" ? "Pixie Concierge" : msg.sender === "agent" ? "Agent" : "Guest");
    const prev = groups[groups.length - 1];
    if (prev && prev.sender === sender) {
      prev.items.push(msg);
    } else {
      groups.push({
        key: `${msg.id}-${sender}`,
        sender,
        display,
        internal,
        items: [msg],
      });
    }
  }
  return groups;
}

export default function SupportAgentDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [assigned, setAssigned] = useState<HandoffRow[]>([]);
  const [queue, setQueue] = useState<HandoffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>(MESSAGE_DUMMY);
  const [composerMode, setComposerMode] = useState<ComposerMode>("public");
  const [reply, setReply] = useState("");
  const [draftPending, setDraftPending] = useState(false);
  const [collapsedAi, setCollapsedAi] = useState<Record<string, boolean>>({});
  const [pendingSend, setPendingSend] = useState(false);
  const [newIds, setNewIds] = useState<Record<string, true>>({});
  const [flashIds, setFlashIds] = useState<Record<string, true>>({});
  const [unreadIds, setUnreadIds] = useState<Record<string, true>>({});
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentCanReceive, setAgentCanReceive] = useState(false);
  const [openChats, setOpenChats] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [clearingSeats, setClearingSeats] = useState(false);

  const inboxLoadedRef = useRef(false);
  const knownConversationIdsRef = useRef(new Set<string>());
  const lastMessageAtRef = useRef(new Map<string, string | null>());
  const selectedIdRef = useRef<string | null>(null);
  const pollMessageAbortRef = useRef<AbortController | null>(null);
  const inboxPollInFlightRef = useRef(false);
  const conversationPollInFlightRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const ping = useCallback(() => {
    try {
      const AudioCtx =
        (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current ?? new AudioCtx();
      audioContextRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 840;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore audio errors
    }
  }, []);

  const fetchInbox = useCallback(async () => {
    const response = await fetch("/api/support/agent/inbox", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as AgentInboxResponse | null;
    if (!response.ok || !data?.ok) {
      if (!inboxLoadedRef.current) {
        setAssigned([]);
        setQueue([]);
        setSelectedId(null);
      }
      return;
    }

    const nextAssigned = (data.assigned ?? []) as HandoffRow[];
    const nextQueue = (data.queue ?? []) as HandoffRow[];

    const all = [...nextAssigned, ...nextQueue];
    const currentIds = new Set(all.map((item) => item.conversation_id));

    const newIdsNow: string[] = [];
    if (inboxLoadedRef.current) {
      for (const id of currentIds) {
        if (!knownConversationIdsRef.current.has(id)) {
          newIdsNow.push(id);
        }
      }
    }

    if (newIdsNow.length > 0) {
      setNewIds((prev) => {
        const next = { ...prev };
        newIdsNow.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      setTimeout(() => {
        setNewIds((prev) => {
          const next = { ...prev };
          newIdsNow.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }, 4200);
      ping();
    }

    const changedMessageIds: string[] = [];
    for (const row of all) {
      const previous = lastMessageAtRef.current.get(row.conversation_id);
      const nextTime = row.last_message_at ?? null;
      if (inboxLoadedRef.current && previous && nextTime && previous !== nextTime) {
        changedMessageIds.push(row.conversation_id);
      }
      lastMessageAtRef.current.set(row.conversation_id, nextTime);
    }

    if (changedMessageIds.length > 0) {
      setFlashIds((prev) => {
        const next = { ...prev };
        changedMessageIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = { ...prev };
          changedMessageIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }, 3000);

      const notActive = changedMessageIds.filter((id) => id !== selectedIdRef.current);
      if (notActive.length > 0) {
        setUnreadIds((prev) => {
          const next = { ...prev };
          notActive.forEach((id) => {
            next[id] = true;
          });
          return next;
        });
        ping();
      }
    }

    knownConversationIdsRef.current = currentIds;
    inboxLoadedRef.current = true;
    setAssigned(nextAssigned);
    setQueue(nextQueue);
  }, [ping]);

  const fetchConversation = useCallback(async (conversationId: string) => {
    if (pollMessageAbortRef.current) {
      try {
        pollMessageAbortRef.current.abort();
      } catch {
        // ignore abort lifecycle errors
      }
    }
    const controller = new AbortController();
    pollMessageAbortRef.current = controller;
    try {
      const response = await fetch(`/api/support/conversation?conversationId=${encodeURIComponent(conversationId)}&includeClosed=1`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; messages?: SupportMessage[] } | null;
      if (!response.ok || !data?.ok) {
        return;
      }
      setMessages((data.messages ?? []) as SupportMessage[]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, [supabase]);

  const refreshAgentOnlineStatus = useCallback(async () => {
    const response = await fetch("/api/support/agent/online", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as AgentOnlineStatus | null;
    if (!response.ok || !data?.ok) return;
    setAgentOnline(Boolean(data.isOnline));
    setAgentCanReceive(Boolean(data.canReceiveLiveChats));
    setOpenChats(data.openChats ?? 0);
    setMaxConcurrent(data.maxConcurrent ?? 1);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refreshAgentOnlineStatus();
  }, [userId, refreshAgentOnlineStatus]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const tick = async () => {
      if (!active) return;
      if (inboxPollInFlightRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      inboxPollInFlightRef.current = true;
      try {
        await fetchInbox();
      } finally {
        inboxPollInFlightRef.current = false;
      }
    };
    void tick();
    const id = setInterval(tick, 12000);
    return () => {
      active = false;
      clearInterval(id);
      inboxPollInFlightRef.current = false;
    };
  }, [fetchInbox, userId]);

  const queueCards = useMemo(() => {
    const all = [...assigned, ...queue].map((row) => toQueueCard(row, userId));
    if (filter === "unassigned") return all.filter((item) => item.unassigned);
    if (filter === "mine") return all.filter((item) => item.assignedToMe);
    return all;
  }, [assigned, queue, filter, userId]);

  useEffect(() => {
    if (queueCards.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queueCards.some((item) => item.id === selectedId)) {
      setSelectedId(queueCards[0].id);
      setUnreadIds((prev) => {
        const next = { ...prev };
        delete next[queueCards[0].id];
        return next;
      });
    }
  }, [queueCards, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages(MESSAGE_DUMMY);
      return;
    }
    if (selectedId.startsWith("demo-")) {
      return;
    }
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      if (conversationPollInFlightRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      conversationPollInFlightRef.current = true;
      try {
        await fetchConversation(selectedId);
      } finally {
        conversationPollInFlightRef.current = false;
      }
    };
    void tick();
    const id = setInterval(tick, 7000);
    return () => {
      alive = false;
      clearInterval(id);
      conversationPollInFlightRef.current = false;
    };
  }, [fetchConversation, selectedId]);

  const selectedCard = useMemo(
    () => queueCards.find((item) => item.id === selectedId) ?? queueCards[0] ?? null,
    [queueCards, selectedId],
  );

  const aiSummary = useMemo(() => composeAiSummary(messages), [messages]);

  const timeline = useMemo<TimelineEvent[]>(() => {
    const source = messages.length > 0 ? messages : CONTEXT_DUMMY;
    return source.map((item, index) => ({
      id: `${item.id}-${index}`,
      label:
        item.sender === "guest"
          ? "Guest message"
          : item.sender === "agent"
            ? "Agent reply"
            : item.sender === "ai"
              ? "AI response"
              : "Internal note",
      detail: item.content,
      at: item.created_at,
    }));
  }, [messages]);

  const handleSelectConversation = useCallback(
    async (conversationId: string, unassigned: boolean) => {
      setSelectedId(conversationId);
      setUnreadIds((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      if (!unassigned) return;
      setClaimingId(conversationId);
      try {
        await fetch("/api/support/agent/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        });
        setFlashIds((prev) => ({ ...prev, [conversationId]: true }));
        setTimeout(() => {
          setFlashIds((prev) => {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          });
        }, 2000);
        ping();
        await fetchInbox();
      } finally {
        setClaimingId(null);
      }
    },
    [fetchInbox, ping],
  );

  const handleResolve = useCallback(async () => {
    if (!selectedCard) return;
    setResolving(true);
    try {
      await fetch("/api/support/conversation/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedCard.id }),
      });
      await fetchInbox();
    } finally {
      setResolving(false);
    }
  }, [fetchInbox, selectedCard]);

  const handleToggleOnline = useCallback(async () => {
    setTogglingOnline(true);
    try {
      const response = await fetch("/api/support/agent/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: !agentOnline, maxConcurrent }),
      });
      const data = (await response.json().catch(() => null)) as AgentOnlineStatus | null;
      if (!response.ok || !data?.ok) return;
      setAgentOnline(Boolean(data.isOnline));
      setAgentCanReceive(Boolean(data.canReceiveLiveChats));
      setOpenChats(data.openChats ?? 0);
      setMaxConcurrent(data.maxConcurrent ?? 1);
    } finally {
      setTogglingOnline(false);
    }
  }, [agentOnline, maxConcurrent]);

  const handleClearBlockedSeats = useCallback(async () => {
    setClearingSeats(true);
    try {
      await fetch("/api/support/agent/seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      await fetchInbox();
      await refreshAgentOnlineStatus();
    } finally {
      setClearingSeats(false);
    }
  }, [fetchInbox, refreshAgentOnlineStatus]);

  const handleSend = useCallback(async () => {
    const trimmed = reply.trim();
    if (!trimmed || !selectedCard || pendingSend) return;

    const optimistic: SupportMessage = {
      id: `local-${Date.now()}`,
      sender: composerMode === "internal" ? "internal_note" : "agent",
      sender_display_name: composerMode === "internal" ? "Internal note" : "You",
      content: composerMode === "internal" ? `[Internal note] ${trimmed}` : trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setReply("");

    if (composerMode === "internal") {
      return;
    }

    setPendingSend(true);
    try {
      await fetch("/api/support/agent/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedCard.id, content: trimmed }),
      });
      await fetchInbox();
    } finally {
      setPendingSend(false);
    }
  }, [composerMode, pendingSend, reply, selectedCard, fetchInbox]);

  const handleGenerateDraft = useCallback(async () => {
    if (!selectedCard || draftPending) return;
    setDraftPending(true);
    try {
      const response = await fetch("/api/support/agent/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedCard.id }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; draft?: string }
        | null;
      if (!response.ok || !data?.ok || !data?.draft) return;
      setReply((prev) => `${prev}${prev ? "\n" : ""}${data.draft}`);
    } finally {
      setDraftPending(false);
    }
  }, [draftPending, selectedCard]);

  const activeGroups = useMemo(() => groupedMessages(messages), [messages]);

  const activeMeta = selectedCard
    ? `Guest · Started ${timeAgo(selectedCard.createdAt)} ago · Assigned to ${selectedCard.assignedToMe ? "you" : selectedCard.unassigned ? "unassigned" : "another agent"}`
    : "Guest · Started now · Assigned to you";

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="grid min-h-[calc(100vh-64px)] grid-cols-[320px_minmax(0,1fr)_360px] gap-4">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Support Inbox</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleClearBlockedSeats()}
                  disabled={clearingSeats}
                  className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
                >
                  {clearingSeats ? "Clearing..." : "Clear blocked seats"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleOnline()}
                  disabled={togglingOnline}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    agentOnline
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-slate-800 text-white hover:bg-slate-900"
                  } disabled:opacity-50`}
                >
                  {togglingOnline
                    ? "Updating..."
                    : agentOnline
                      ? "Accepting calls"
                      : "Accept calls"}
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {agentOnline
                ? `Live status: ${agentCanReceive ? "Ready" : "At capacity"} (${openChats}/${maxConcurrent})`
                : "Live status: Offline"}
            </p>
            <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              {(["all", "unassigned", "mine"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-md px-3 py-1.5 capitalize transition ${filter === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto">
            {queueCards.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                You&apos;re all caught up 🎉
              </div>
            ) : (
              queueCards.map((item) => {
                const isActive = item.id === selectedCard?.id;
                const waitingHot = item.waitingMinutes > 5;
                const isNew = Boolean(newIds[item.id]);
                const flash = Boolean(flashIds[item.id]);
                const unread = Boolean(unreadIds[item.id]);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleSelectConversation(item.id, item.unassigned)}
                    className={`relative flex h-[84px] w-full flex-col justify-between border-b border-slate-200 px-3 py-3 text-left transition ${
                      isActive ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                    } ${isNew ? "animate-pulse" : ""} ${flash ? "ring-1 ring-emerald-300" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-1.5">
                        {item.unassigned ? <Dot className="h-4 w-4 shrink-0 text-emerald-500" /> : null}
                        <p className={`truncate text-sm ${item.unassigned || unread ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
                          {item.customerName}
                        </p>
                      </div>
                      <div className={`shrink-0 text-xs ${waitingHot ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                        {item.waitingMinutes}m
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-500">{item.topic}</p>
                      {item.unassigned ? (
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleSelectConversation(item.id, true);
                          }}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                        >
                          {claimingId === item.id ? "Taking..." : "Take"}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${unread ? "font-medium text-slate-700" : "text-slate-500"}`}>{item.preview}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.badge === "AI handoff"
                          ? "bg-violet-100 text-violet-700"
                          : item.badge === "Agent replied"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-700"
                      }`}>
                        {item.badge}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white">
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200 px-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900">{selectedCard?.customerName ?? "Support conversation"}</h3>
              <p className="truncate text-xs text-slate-500">{activeMeta}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleResolve()}
                disabled={!selectedCard || resolving}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {resolving ? "Resolving..." : "Resolve"}
              </button>
              <button type="button" className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">AI Summary</p>
                <p className="mt-1 text-sm text-slate-700">{aiSummary.intent}</p>
                <p className="mt-1 text-sm text-slate-700">Suggested: {aiSummary.suggestedNext}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => setReply((prev) => `${prev}${prev ? "\n" : ""}${aiSummary.suggestedNext}`)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Insert into reply
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsedAi((prev) => {
                    const next = { ...prev };
                    messages.filter((m) => m.sender === "ai").forEach((m) => {
                      next[m.id] = !next[m.id];
                    });
                    return next;
                  })}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  View AI transcript
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {activeGroups.map((group) => (
                <div key={group.key} className="space-y-1">
                  {group.internal ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <p className="font-semibold uppercase tracking-[0.08em]">Internal note</p>
                      {group.items.map((item) => (
                        <p key={item.id} className="mt-1 leading-5">{item.content.replace(/^\[Internal note\]\s*/i, "")}</p>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{group.display}</p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isAi = item.sender === "ai";
                          const collapsed = isAi ? collapsedAi[item.id] !== false : false;
                          return (
                            <div
                              key={item.id}
                              className={`rounded-lg px-3 py-2 text-sm ${item.sender === "agent" ? "ml-auto max-w-[82%] bg-slate-900 text-white" : "max-w-[82%] bg-slate-100 text-slate-800"}`}
                            >
                              {isAi && collapsed ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"
                                  onClick={() => setCollapsedAi((prev) => ({ ...prev, [item.id]: false }))}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" /> Expand AI message
                                </button>
                              ) : (
                                <>
                                  <p>{item.content}</p>
                                  <p className={`mt-1 text-[11px] ${item.sender === "agent" ? "text-slate-300" : "text-slate-500"}`}>
                                    {formatTimestamp(item.created_at)}
                                  </p>
                                  {isAi ? (
                                    <button
                                      type="button"
                                      className="mt-1 text-[11px] font-semibold text-slate-500 underline"
                                      onClick={() => setCollapsedAi((prev) => ({ ...prev, [item.id]: true }))}
                                    >
                                      Collapse
                                    </button>
                                  ) : null}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <footer className="border-t border-slate-200 p-4">
            <div className="flex flex-col gap-3">
              <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setComposerMode("public")}
                  className={`rounded-md px-3 py-1.5 ${composerMode === "public" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Public Reply
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("internal")}
                  className={`rounded-md px-3 py-1.5 ${composerMode === "internal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Internal Note
                </button>
              </div>

              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                className="min-h-[72px] w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder={composerMode === "public" ? "Type your reply..." : "Add an internal note..."}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleGenerateDraft()}
                    disabled={!selectedCard || draftPending}
                    className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" /> {draftPending ? "Drafting..." : "AI draft"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!reply.trim() || pendingSend || !selectedCard}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </div>
            </div>
          </footer>
        </section>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Customer</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCard?.customerName ?? "Guest"}</p>
            <p className="text-xs text-slate-500">{selectedCard?.customerEmail ?? "No email"}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Conversation Facts</p>
            <div className="mt-2 space-y-1 text-xs text-slate-700">
              <p><span className="font-semibold">Topic:</span> {selectedCard?.topic ?? "General support"}</p>
              <p><span className="font-semibold">Status:</span> {selectedCard?.status ?? "open"}</p>
              <p><span className="font-semibold">Sentiment:</span> Neutral</p>
              <p><span className="font-semibold">Priority:</span> {(selectedCard?.waitingMinutes ?? 0) > 5 ? "High" : "Normal"}</p>
              <p><span className="font-semibold">Handoff reason:</span> AI handoff</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Suggested Actions</p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                onClick={() => setReply("Could you share your exact dates and party size so I can narrow this down?")}
                className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700"
              >
                Ask clarifying question
              </button>
              <button
                type="button"
                onClick={() => setReply("Pricing depends on resort, dates, room type, and point requirement. I can walk you through your exact scenario.")}
                className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700"
              >
                Send pricing explanation
              </button>
              <button
                type="button"
                onClick={() => setComposerMode("internal")}
                className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700"
              >
                Escalate
              </button>
              <button
                type="button"
                onClick={() => void handleResolve()}
                className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700"
              >
                Mark resolved
              </button>
            </div>
          </div>

          <div className="min-h-0 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Timeline</p>
            <div className="mt-2 max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {timeline.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-slate-800">{event.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">{event.detail}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{timeAgo(event.at)} ago</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
