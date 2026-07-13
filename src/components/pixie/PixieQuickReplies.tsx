"use client";

import type { PixieQuestionKey } from "@/lib/pixie/types";

const replies: Record<PixieQuestionKey, string[]> = {
  ask_dates: ["We already have dates", "Our dates are flexible", "We are not sure yet"],
  ask_party: ["2 adults", "2 adults and 2 children", "I’ll describe everyone"],
  ask_budget_context: ["Accommodation budget only", "Nightly budget", "We are still deciding"],
  ask_trip_priorities: ["Help me choose a resort", "Easy park transportation", "Pool time matters"],
  ask_pace: ["Relaxed", "Balanced", "Full park days"],
  ask_park_days: ["Mostly park days", "Some rest days", "We are not sure"],
  ask_resort_choice: ["Show resort ideas", "We have preferred resorts", "Find us a Ready Stay"],
  ask_room_type: ["Studio is fine", "We need more space", "Help me pick a room"],
};

export default function PixieQuickReplies({
  nextQuestionKey,
  disabled,
  onSend,
}: {
  nextQuestionKey?: PixieQuestionKey;
  disabled: boolean;
  onSend: (message: string) => void;
}) {
  const options = nextQuestionKey ? replies[nextQuestionKey] : ["We are just starting", "We are flexible", "Find us a Ready Stay"];
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onSend(option)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

