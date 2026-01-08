"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase";

type HandoffRow = {
  conversation_id: string;
  status: "open" | "claimed" | "resolved";
  created_at: string;
  assigned_agent_user_id: string | null;
};

type SupportMessage = {
  id: string;
  sender: "guest" | "ai" | "agent";
  content: string;
  created_at: string;
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const loadAgent = async () => {
      const { data } = await supabase
        .from("support_agents")
        .select("online, max_concurrent")
        .eq("user_id", userId)
        .single();
      if (data) {
        setOnline(Boolean(data.online));
        setMaxConcurrent(data.max_concurrent ?? 1);
      }
    };
    void loadAgent();
  }, [supabase, userId]);

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
    };
    const interval = setInterval(refresh, 5000);
    void refresh();
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [supabase, userId]);

  useEffect(() => {
    if (!selectedConversation) return;
    let alive = true;
    const refreshMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id,sender,content,created_at")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      if (alive) {
        setMessages((data ?? []) as SupportMessage[]);
      }
    };
    const interval = setInterval(refreshMessages, 4000);
    void refreshMessages();
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [supabase, selectedConversation]);

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
    setOnline(nextOnline);
    await fetch("/api/support/agent/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: nextOnline, maxConcurrent }),
    });
  }

  async function updateMaxConcurrent(nextValue: number) {
    setMaxConcurrent(nextValue);
    await fetch("/api/support/agent/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online, maxConcurrent: nextValue }),
    });
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
  }

  async function claimConversation(conversationId: string) {
    await fetch("/api/support/agent/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Concierge Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage handoffs and respond to guests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">
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
                  onClick={() => setSelectedConversation(item.conversation_id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                    selectedConversation === item.conversation_id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="font-semibold">Conversation</div>
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
          <h2 className="text-sm font-semibold text-slate-900">
            Conversation
          </h2>
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
                      {message.sender}
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
