"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase";

type HandoffRow = {
  conversation_id: string;
  status: "open" | "claimed" | "resolved";
  created_at: string;
  assigned_agent_user_id: string | null;
};

type SupportMessage = {
  id: string;
  sender: "guest" | "ai" | "agent" | "system";
  sender_display_name?: string | null;
  content: string;
  created_at: string;
};

type AgentAvailabilityStatus = {
  ok: boolean;
  isAdmin?: boolean;
  isSupportAgent?: boolean;
  profileRole?: string | null;
  appRole?: string | null;
  isOnline?: boolean;
  isActive?: boolean;
  maxConcurrent?: number;
  openChats?: number;
  canReceiveLiveChats?: boolean;
};

export default function SupportAgentDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [assigned, setAssigned] = useState<HandoffRow[]>([]);
  const [queue, setQueue] = useState<HandoffRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [agentStatusNote, setAgentStatusNote] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AgentAvailabilityStatus | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [newAssignedIds, setNewAssignedIds] = useState<Record<string, true>>({});
  const [activeUnreadCount, setActiveUnreadCount] = useState(0);
  const [conversationOpenAt, setConversationOpenAt] = useState<Record<string, number>>({});
  const [lastAgentReplyAt, setLastAgentReplyAt] = useState<Record<string, number>>({});
  const assignedInitializedRef = useRef(false);
  const seenAssignedRef = useRef(new Set<string>());
  const lastRingAtRef = useRef(0);
  const messageIdsByConversationRef = useRef(new Map<string, Set<string>>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const conversationOpenAtRef = useRef<Record<string, number>>({});
  const lastAgentReplyAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    conversationOpenAtRef.current = conversationOpenAt;
  }, [conversationOpenAt]);

  useEffect(() => {
    lastAgentReplyAtRef.current = lastAgentReplyAt;
  }, [lastAgentReplyAt]);

  const ring = useCallback(() => {
    const now = Date.now();
    if (!audioReady) return;
    if (now - lastRingAtRef.current < 1200) return;
    lastRingAtRef.current = now;
    try {
      const AudioCtx =
        (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current ?? new AudioCtx();
      audioContextRef.current = ctx;
      const playTone = (frequency: number, delay: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.0001;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + delay;
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      };
      playTone(880, 0);
      playTone(660, 0.17);
    } catch {
      // no-op
    }
  }, [audioReady]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (audioReady) return;
    const unlockAudio = () => {
      setAudioReady(true);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [audioReady]);

  useEffect(() => {
    if (!userId) return;
    const loadAgent = async () => {
      const response = await fetch("/api/support/agent/online");
      const payload = (await response.json().catch(() => null)) as AgentAvailabilityStatus | null;
      if (!response.ok || !payload?.ok) {
        return;
      }
      setAvailabilityStatus(payload);
      setOnline(Boolean(payload.isOnline));
      setMaxConcurrent(payload.maxConcurrent ?? 1);
    };
    void loadAgent();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const refresh = async () => {
      const { data: assignedRows } = await supabase
        .from("support_handoffs")
        .select("conversation_id,status,assigned_agent_user_id,created_at")
        .eq("assigned_agent_user_id", userId)
        .in("status", ["open", "claimed"])
        .order("created_at", { ascending: false });
      const { data: queueRows } = await supabase
        .from("support_handoffs")
        .select("conversation_id,status,assigned_agent_user_id,created_at")
        .is("assigned_agent_user_id", null)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (!alive) return;
      setAssigned((assignedRows ?? []) as HandoffRow[]);
      setQueue((queueRows ?? []) as HandoffRow[]);

      const assignedIds = new Set((assignedRows ?? []).map((row) => row.conversation_id));
      if (!assignedInitializedRef.current) {
        assignedIds.forEach((id) => seenAssignedRef.current.add(id));
        assignedInitializedRef.current = true;
        return;
      }
      const newlyAssigned = [...assignedIds].filter((id) => !seenAssignedRef.current.has(id));
      if (newlyAssigned.length > 0) {
        setNewAssignedIds((prev) => {
          const next = { ...prev };
          newlyAssigned.forEach((id) => {
            next[id] = true;
          });
          return next;
        });
        ring();
      }
      seenAssignedRef.current.clear();
      assignedIds.forEach((id) => seenAssignedRef.current.add(id));
    };
    const interval = setInterval(refresh, 5000);
    void refresh();
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [supabase, userId, ring]);

  useEffect(() => {
    if (!selectedConversation) return;
    let alive = true;
    const refreshMessages = async () => {
      const response = await fetch(
        `/api/support/conversation?conversationId=${encodeURIComponent(selectedConversation)}`,
      );
      const data = (await response.json()) as { ok?: boolean; messages?: SupportMessage[] };
      if (alive && data?.ok) {
        const nextMessages = (data.messages ?? []) as SupportMessage[];
        setMessages(nextMessages);

        const seenIds =
          messageIdsByConversationRef.current.get(selectedConversation) ?? new Set<string>();
        const newGuestMessages = nextMessages.filter(
          (message) => message.sender === "guest" && !seenIds.has(message.id),
        );
        nextMessages.forEach((message) => seenIds.add(message.id));
        messageIdsByConversationRef.current.set(selectedConversation, seenIds);

        const conversationOpenedAt = conversationOpenAtRef.current[selectedConversation] ?? Date.now();
        const lastReplyAt = lastAgentReplyAtRef.current[selectedConversation] ?? 0;
        const unreadGuestMessages = nextMessages.filter((message) => {
          if (message.sender !== "guest") return false;
          const createdAt = new Date(message.created_at).getTime();
          return createdAt >= conversationOpenedAt && createdAt > lastReplyAt;
        });
        setActiveUnreadCount(unreadGuestMessages.length);

        if (newGuestMessages.length > 0 && selectedConversation) {
          ring();
        }
      }
    };
    const interval = setInterval(refreshMessages, 4000);
    void refreshMessages();
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [selectedConversation, ring]);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
        <p className="text-sm font-semibold">Agent access required</p>
        <p className="mt-2 text-sm">
          Please sign in to access the concierge dashboard.
        </p>
      </div>
    );
  }

  async function updateOnline(nextOnline: boolean) {
    const previous = online;
    setOnline(nextOnline);
    const response = await fetch("/api/support/agent/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: nextOnline, maxConcurrent }),
    });
    if (!response.ok) {
      setOnline(previous);
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; isAdmin?: boolean; profileRole?: string | null; appRole?: string | null }
        | null;
      if (payload?.error === "NOT_AGENT_ELIGIBLE") {
        setAgentStatusNote(
          `Not eligible for live agent mode (isAdmin: ${String(payload.isAdmin)}, profileRole: ${payload.profileRole ?? "null"}, appRole: ${payload.appRole ?? "null"}).`,
        );
      } else {
        setAgentStatusNote("Unable to update agent availability.");
      }
      return;
    }
    const payload = (await response.json().catch(() => null)) as AgentAvailabilityStatus | null;
    if (payload?.ok) {
      setAvailabilityStatus(payload);
      setOnline(Boolean(payload.isOnline));
      setMaxConcurrent(payload.maxConcurrent ?? 1);
    }
    setAgentStatusNote(null);
  }

  async function updateMaxConcurrent(nextValue: number) {
    setMaxConcurrent(nextValue);
    const response = await fetch("/api/support/agent/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online, maxConcurrent: nextValue }),
    });
    const payload = (await response.json().catch(() => null)) as AgentAvailabilityStatus | null;
    if (payload?.ok) {
      setAvailabilityStatus(payload);
      setOnline(Boolean(payload.isOnline));
      setMaxConcurrent(payload.maxConcurrent ?? nextValue);
    }
  }

  async function sendReply() {
    const trimmed = reply.trim();
    if (!trimmed || !selectedConversation) return;
    setReply("");
    await fetch("/api/support/agent/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedConversation, content: trimmed }),
    });
    setLastAgentReplyAt((prev) => ({
      ...prev,
      [selectedConversation]: Date.now(),
    }));
    setActiveUnreadCount(0);
  }

  async function claimConversation(conversationId: string) {
    await fetch("/api/support/agent/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
  }

  function selectConversation(conversationId: string) {
    setSelectedConversation(conversationId);
    setConversationOpenAt((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId] ?? Date.now(),
    }));
    setNewAssignedIds((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    setActiveUnreadCount(0);
  }

  async function endConversation() {
    if (!selectedConversation) return;
    await fetch("/api/support/conversation/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedConversation }),
    });
    setSelectedConversation(null);
    setMessages([]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Concierge Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage handoffs and respond to guests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500">
              Seats
            </label>
            <select
              value={maxConcurrent}
              onChange={(event) =>
                updateMaxConcurrent(Number(event.target.value))
              }
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateOnline(!online)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                online
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {online ? "Online" : "Offline"}
            </button>
          </div>
        </div>
        {agentStatusNote ? (
          <p className="mt-3 text-xs text-rose-600">{agentStatusNote}</p>
        ) : null}
        {availabilityStatus ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-slate-300 px-2 py-1 text-slate-700">
              Eligible: {(availabilityStatus.isAdmin || availabilityStatus.isSupportAgent) ? "Yes" : "No"}
            </span>
            <span className="rounded-full border border-slate-300 px-2 py-1 text-slate-700">
              Online: {availabilityStatus.isOnline ? "Yes" : "No"}
            </span>
            <span className="rounded-full border border-slate-300 px-2 py-1 text-slate-700">
              Can receive live chats: {availabilityStatus.canReceiveLiveChats ? "Yes" : "No"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Assigned</h2>
            <div className="mt-3 space-y-2">
              {assigned.length === 0 && (
                <p className="text-xs text-slate-500">No assigned tickets.</p>
              )}
              {assigned.map((item) => (
                <button
                  key={item.conversation_id}
                  type="button"
                  onClick={() => selectConversation(item.conversation_id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                    selectedConversation === item.conversation_id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : newAssignedIds[item.conversation_id]
                        ? "border-emerald-300 bg-emerald-50 text-slate-800"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Conversation</div>
                    {newAssignedIds[item.conversation_id] ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide">
                    {item.status}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Open queue</h2>
            <div className="mt-3 space-y-2">
              {queue.length === 0 && (
                <p className="text-xs text-slate-500">No open tickets.</p>
              )}
              {queue.map((item) => (
                <div
                  key={item.conversation_id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <div className="font-semibold text-slate-800">
                    Conversation
                  </div>
                  <button
                    type="button"
                    onClick={() => claimConversation(item.conversation_id)}
                    className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                  >
                    Claim
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Conversation
            </h2>
            {selectedConversation ? (
              <button
                type="button"
              onClick={endConversation}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              End chat
            </button>
          ) : null}
        </div>
          {selectedConversation && activeUnreadCount > 0 ? (
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              {activeUnreadCount} unread guest message{activeUnreadCount === 1 ? "" : "s"}
            </p>
          ) : null}
          {!selectedConversation ? (
            <p className="mt-3 text-sm text-slate-500">
              Select a conversation to view messages.
            </p>
          ) : (
            <div className="mt-4 flex h-[420px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {messages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {message.sender_display_name || message.sender}
                    </span>
                    <span className="text-slate-800">{message.content}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Type reply..."
                />
                <button
                  type="button"
                  onClick={sendReply}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
