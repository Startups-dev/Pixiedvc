import Link from "next/link";

export default function GuestPoliciesPage() {
  const featureRows = [
    {
      icon: "◌",
      title: "Availability Checked",
      body: "We verify real DVC availability before anything moves forward.",
    },
    {
      icon: "$",
      title: "Full Pricing First",
      body: "You review the total price and terms before any payment is made.",
    },
    {
      icon: "#",
      title: "Disney Confirmation",
      body: "Every secured stay includes a Disney reservation number.",
    },
    {
      icon: "↺",
      title: "Flexible Options",
      body: "Credit or rebooking paths may be available if plans change.",
    },
    {
      icon: "✓",
      title: "Concierge Managed",
      body: "HannaDVC coordinates the process from request through confirmation.",
    },
  ];

  return (
    <main className="bg-[#f7f4ef] text-[#0F2148]">
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <div className="rounded-[28px] border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)] md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0F2148]/55">
            Before you request your stay
          </p>
          <h1 className="mt-3 font-display !text-[1.6rem] !font-semibold !leading-[1.02] !text-[#0F2148] sm:!text-[2.4rem]">
            How booking works
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#0F2148]/72">
            A simple, guided booking process with clear pricing, verified owners, and concierge support at every step.
          </p>
          <div className="mt-6 space-y-3">
            {featureRows.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-[#0F2148]/8 bg-[#f7f9fc] px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F2148] text-sm font-semibold text-white">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F2148]">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#0F2148]/72">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold tracking-[0.04em] text-[#30405f]">
              Request → Review → Confirm → Done
            </p>
            <p className="text-sm text-[#0F2148]/72">
              Booked through verified DVC owners, coordinated by HannaDVC.
            </p>
          </div>
          <p className="mt-6 text-sm font-semibold text-[#0F2148]/88">
            You approve everything before anything is finalized.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-full bg-[#0F2148] px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#1A2F66] hover:!text-white"
            >
              Start Your Stay
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-[#0F2148]/14 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/28"
            >
              Contact Concierge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
