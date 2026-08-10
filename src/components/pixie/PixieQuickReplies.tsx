"use client";

import type { PixieChatState } from "@/lib/pixie/client/types";
import type { PixieQuestionKey } from "@/lib/pixie/types";

const replies: Record<PixieQuestionKey, Array<{ label: string; message: string }>> = {
  ask_dates: [
    { label: "We know our dates", message: "We know our travel dates." },
    { label: "Our dates are flexible", message: "Our dates are flexible." },
    { label: "Not sure yet", message: "We are not sure about dates yet." },
  ],
  ask_party: [
    { label: "2 adults", message: "We are two adults." },
    { label: "2 adults, 2 children", message: "We are two adults and two children." },
    { label: "I’ll describe everyone", message: "I will describe who is traveling." },
  ],
  ask_budget_context: [
    { label: "Accommodation budget", message: "I want to set an accommodation-only budget." },
    { label: "Nightly budget", message: "I want to set a nightly accommodation budget." },
    { label: "Whole-trip budget", message: "I have a whole-trip budget, not just lodging." },
    { label: "Still deciding", message: "I am still deciding on budget." },
  ],
  ask_trip_priorities: [
    { label: "Help me choose", message: "Help me choose the right resort priorities." },
    { label: "Easy transportation", message: "Easy park transportation matters to us." },
    { label: "Pool time matters", message: "Pool time matters to us." },
  ],
  ask_pace: [
    { label: "Relaxed", message: "We want a relaxed pace." },
    { label: "Balanced", message: "We want a balanced pace." },
    { label: "Full park days", message: "We want full park days." },
    { label: "You decide", message: "You decide the best pace for us." },
  ],
  ask_park_days: [
    { label: "Spread them out", message: "Spread the park days out with breaks." },
    { label: "Group park days", message: "Group the park days together." },
    { label: "You decide", message: "You decide the best park-day rhythm." },
  ],
  ask_resort_choice: [
    { label: "Keep Hara’s favorite", message: "Keep Hara's favorite resort as the leading option." },
    { label: "Compare top two", message: "Compare the top two resort options for me." },
    { label: "Show lower-cost options", message: "Show me lower-cost resort options if they still fit." },
    { label: "Check Ready Stays", message: "Check Ready Stays that match this trip." },
  ],
  ask_room_type: [
    { label: "Studio is fine", message: "A studio is fine if it fits our party." },
    { label: "We need more space", message: "We need more space than a studio." },
    { label: "Help me pick", message: "Help me pick the right room type." },
  ],
};

const dvcReplies = [
  { label: "Explain Holding points", message: "Explain how Holding points could affect this change." },
  { label: "Compare modifications", message: "Compare the reservation modification options and risks." },
  { label: "Review point risk", message: "Review the current-year, next-year, and borrowing risk." },
];

const itineraryReplies = [
  { label: "Resolve open night", message: "Help me resolve the unresolved night." },
  { label: "Review split stay", message: "Review this split stay and the resort-move tradeoffs." },
  { label: "Compare party night", message: "Compare the party-night lodging options." },
];

function contextualReplies(state?: PixieChatState, nextQuestionKey?: PixieQuestionKey) {
  const openDecisions = state?.tripState.planningWorkspace.activeDecisions.some((decision) => decision.status !== "resolved");
  const hasDvcRisk = Boolean(
    state?.tripState.dvcContext.holdingExposure ||
      state?.tripState.dvcContext.borrowingContemplated ||
      state?.tripState.dvcContext.planningRisks.length ||
      state?.tripState.dvcContext.unresolvedDecisions.length ||
      openDecisions,
  );
  if (hasDvcRisk) return dvcReplies;
  const hasWorkingItinerary = Boolean(state?.tripState.planningWorkspace.workingItinerary.length);
  if (hasWorkingItinerary) return itineraryReplies;
  if (state?.recommendations?.recommendations.length) return replies.ask_resort_choice;
  if (nextQuestionKey === "ask_budget_context" && state?.tripState.budget.budgetType !== "unknown" && state?.tripState.budget.amountCents !== undefined) {
    return replies.ask_resort_choice;
  }
  if (nextQuestionKey) return replies[nextQuestionKey];
  return [
    { label: "We’re just starting", message: "We are just starting our Walt Disney World plans." },
    { label: "We’re flexible", message: "We are flexible and want Hara to guide us." },
    { label: "Find a Ready Stay", message: "Find us a Ready Stay if one fits." },
  ];
}

export default function PixieQuickReplies({
  state,
  nextQuestionKey,
  disabled,
  onSend,
}: {
  state?: PixieChatState;
  nextQuestionKey?: PixieQuestionKey;
  disabled: boolean;
  onSend: (message: string) => void;
}) {
  const options = contextualReplies(state, nextQuestionKey).slice(0, 4);
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={disabled}
            onClick={() => onSend(option.message)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
