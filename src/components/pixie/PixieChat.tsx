"use client";

import { PanelRightOpen } from "lucide-react";

import PixieComposer from "@/components/pixie/PixieComposer";
import PixieMessageList from "@/components/pixie/PixieMessageList";
import PixieQuickReplies from "@/components/pixie/PixieQuickReplies";
import PixieThinkingState from "@/components/pixie/PixieThinkingState";
import type { PixieChatState } from "@/lib/pixie/client/types";

export default function PixieChat({
  state,
  canSend,
  onInputChange,
  onSend,
  onCancel,
  onPlanOpen,
}: {
  state: PixieChatState;
  canSend: boolean;
  onInputChange: (value: string) => void;
  onSend: (message: string) => void;
  onCancel: () => void;
  onPlanOpen: () => void;
}) {
  const active = state.status === "sending" || state.status === "thinking" || state.status === "updating_trip" || state.status === "comparing_resorts" || state.status === "checking_ready_stays";
  return (
    <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Conversation</p>
          <p className="text-xs text-slate-500">Text planning only. No booking action happens here.</p>
        </div>
        <button
          type="button"
          onClick={onPlanOpen}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden"
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          Plan
        </button>
      </div>
      <PixieMessageList messages={state.messages} currentAssistantText={state.currentAssistantText} />
      {active ? <PixieThinkingState status={state.status} /> : null}
      {state.error ? (
        <div className="mx-4 mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error.message}
        </div>
      ) : null}
      <PixieQuickReplies state={state} nextQuestionKey={state.nextQuestionKey ?? state.completeness.suggestedNextQuestionKey} onSend={onSend} disabled={active} />
      <PixieComposer
        value={state.pendingInput}
        disabled={active}
        active={active}
        canSend={canSend}
        onChange={onInputChange}
        onSend={() => onSend(state.pendingInput)}
        onCancel={onCancel}
      />
    </section>
  );
}
