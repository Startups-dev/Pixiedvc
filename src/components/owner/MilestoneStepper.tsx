import { MILESTONE_SEQUENCE } from "@/lib/owner-portal";

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-500 text-white",
  pending: "bg-slate-200 text-slate-600",
  blocked: "bg-amber-200 text-amber-700",
};
type MilestoneStepLike = {
  code: string;
  label: string;
};

export default function MilestoneStepper({
  milestones,
  compact = false,
  steps,
  pendingTextByCode,
}: {
  milestones: Array<{ code: string; status: string; occurred_at: string | null }>;
  compact?: boolean;
  steps?: MilestoneStepLike[];
  pendingTextByCode?: Record<string, string>;
}) {
  const sequence = steps ?? MILESTONE_SEQUENCE;
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {sequence.map((step) => {
        const match = milestones.find((milestone) => milestone.code === step.code);
        const status = match?.status ?? "pending";
        const pill = statusStyles[status] ?? statusStyles.pending;
        const pendingText = pendingTextByCode?.[step.code];
        return (
          <div key={step.code} className="flex items-start gap-3">
            <div className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${pill}`}>
              {status === "completed" ? "✓" : ""}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{step.label}</p>
              {!compact ? (
                <p className="text-xs text-muted">
                  {status === "completed" && match?.occurred_at
                    ? `Completed ${new Date(match.occurred_at).toLocaleDateString()}`
                    : status === "blocked"
                      ? "Blocked"
                      : pendingText ?? "Pending"}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
