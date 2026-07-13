import type { PixieChatStatus } from "@/lib/pixie/client/types";

function labelFor(status: PixieChatStatus) {
  switch (status) {
    case "sending":
    case "thinking":
      return "Understanding your trip";
    case "updating_trip":
      return "Updating your plan";
    case "comparing_resorts":
      return "Comparing resorts";
    case "checking_ready_stays":
      return "Checking Ready Stays";
    default:
      return "Working";
  }
}

export default function PixieThinkingState({ status }: { status: PixieChatStatus }) {
  return (
    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" role="status" aria-live="polite">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#2e8fff]" />
      {labelFor(status)}
    </div>
  );
}

