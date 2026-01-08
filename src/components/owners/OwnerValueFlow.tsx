import { ArrowDown, ArrowRight } from "lucide-react";

const steps = [
  { title: "You Share Your Points", body: "Resort • Use Year • Dates" },
  { title: "We Match & Verify", body: "Guest ID + Payment secured" },
  { title: "You Approve Booking", body: "Agreement reviewed + signed" },
  { title: "Payout Released", body: "After check-out (≤ 5 biz days)" },
];

export default function OwnerValueFlow() {
  return (
    <section className="py-2">
      <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-4">
        {steps.map((step, idx) => (
          <div key={step.title} className="contents">
            <DarkTile title={step.title} body={step.body} />
            {idx < steps.length - 1 ? <ArrowNode direction="right" /> : null}
          </div>
        ))}
      </div>

      <div className="lg:hidden space-y-3">
        {steps.map((step, idx) => (
          <div key={step.title}>
            <DarkTile title={step.title} body={step.body} />
            {idx < steps.length - 1 ? (
              <div className="my-3 flex justify-center">
                <ArrowNode direction="down" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function DarkTile({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-2xl bg-[#0B1E3A] px-6 py-5 text-white shadow-sm ring-1 ring-white/10"
      style={{ backgroundColor: "#0B1E3A" }}
    >
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-sm text-white/70">{body}</div>
    </div>
  );
}

function ArrowNode({ direction }: { direction: "right" | "down" }) {
  const Icon = direction === "right" ? ArrowRight : ArrowDown;
  return (
    <div className="flex items-center justify-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
