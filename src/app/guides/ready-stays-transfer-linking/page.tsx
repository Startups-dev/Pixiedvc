import type { Metadata } from "next";
import Link from "next/link";

import { Card, SectionHeader } from "@pixiedvc/design-system";

export const metadata: Metadata = {
  title: "Ready Stays Guide",
  description:
    "How Ready Stays work, transfer timing, and how to link your reservation in My Disney Experience.",
  alternates: {
    canonical: "/guides/ready-stays-transfer-linking",
  },
};

const GUIDE_LINKS = [
  { id: "what-is-ready-stay", label: "1. What Is a Ready Stay?" },
  { id: "how-ready-stay-works", label: "2. How the Ready Stay Process Works" },
  { id: "when-can-i-link", label: "3. When Can I Link My Reservation?" },
  { id: "how-to-link", label: "4. How to Link Your Reservation" },
  { id: "transfer-in-progress", label: "5. Transfer in Progress, What That Means" },
];

export default function ReadyStaysGuidePage() {
  return (
    <div className="bg-[#F7F5F2] py-20">
      <div className="mx-auto max-w-5xl space-y-10 px-6">
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Guides"
            title="Ready Stays Guide"
            description="A clear walkthrough of payment, transfer, and linking so you always know where your trip stands."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE_LINKS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <details id="what-is-ready-stay" className="rounded-2xl border border-slate-200 bg-white p-5" open>
            <summary className="cursor-pointer list-none text-base font-semibold text-ink marker:content-none">
              What Is a Ready Stay?
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                A Ready Stay is a Disney Vacation Club reservation that is already booked and confirmed, and ready to be transferred into your name.
              </p>
              <p>
                There is no waiting on availability, no matching process, and no uncertainty. The dates are locked, the resort is secured, and the room type is already confirmed.
              </p>
              <p>It is simple. If you see it available, it is real.</p>
              <p>
                Unlike traditional DVC bookings, where availability has to be searched and secured after payment, a Ready Stay is already in place. You are stepping into an existing confirmed reservation.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Faster</li>
                <li>More predictable</li>
                <li>Perfect for short-notice trips</li>
                <li>Ideal if you want certainty before committing</li>
              </ul>
              <p>
                Once you complete payment and accept the agreement, the owner transfers the reservation into your name.
              </p>
              <p>
                Ready Stays include accommodations only. Park tickets, dining plans, and other Disney add-ons are arranged separately through Disney.
              </p>
            </div>
          </details>

          <details id="how-ready-stay-works" className="rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-ink marker:content-none">
              How It Works, Step by Step
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="font-semibold text-ink">Step 1, Choose Your Stay</p>
              <p>
                Pick the Ready Stay that fits your travel plans. The resort, dates, room type, and points are already secured. There is no waiting for availability approval.
              </p>
              <p className="font-semibold text-ink">Step 2, Enter Guest Information</p>
              <p>You will enter full legal names, contact details, address, and full party information including child ages.</p>
              <p>
                It is important that names are exact. Disney requires reservations to match legal names for all guests. Even small spelling differences can delay linking.
              </p>
              <p className="font-semibold text-ink">Step 3, Review the Agreement</p>
              <p>
                Before paying, you review your rental agreement with resort and room details, travel dates, total cost, and policies.
              </p>
              <p className="font-semibold text-ink">Step 4, Complete Payment</p>
              <p>Ready Stays require full payment at checkout. Payment moves you directly to transfer.</p>
              <p className="font-semibold text-ink">Step 5, Owner Transfer</p>
              <p>
                After payment, the owner updates Disney's system to place the reservation in your name. This is a standard DVC administrative step.
              </p>
              <p className="font-semibold text-ink">Step 6, You Are Ready to Link</p>
              <p>
                Once transfer is complete, your confirmation number becomes active, your dashboard updates to Ready to link, and you can link in My Disney Experience.
              </p>
            </div>
          </details>

          <details id="when-can-i-link" className="rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-ink marker:content-none">
              When Will My Confirmation Be Ready?
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>After payment, your reservation enters transfer stage.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>You may see the confirmation number in your agreement</li>
                <li>Your dashboard will show Pending</li>
                <li>The reservation will not link yet in My Disney Experience</li>
              </ul>
              <p>That is normal.</p>
              <p>
                The confirmation becomes active only after the owner finishes transfer inside Disney's system.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Your dashboard changes to Ready to link</li>
                <li>The confirmation number becomes usable</li>
                <li>You can link immediately</li>
              </ul>
              <p>Most transfers are completed within 24 to 48 hours, often sooner.</p>
            </div>
          </details>

          <details id="how-to-link" className="rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-ink marker:content-none">
              Linking in My Disney Experience
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>When your dashboard shows Ready to link:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open the My Disney Experience app or DisneyWorld.com</li>
                <li>Go to My Plans</li>
                <li>Select Link a Reservation</li>
                <li>Enter your confirmation number</li>
                <li>Confirm your details</li>
              </ol>
              <p>
                Once linked, your stay appears in your Disney itinerary and you can begin planning dining, Genie+ selections, and more.
              </p>
              <p>If it does not appear right away:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Double-check name spelling</li>
                <li>Confirm your dashboard shows Ready to link</li>
                <li>Give the system a few minutes to refresh</li>
                <li>Reach out if you need help</li>
              </ul>
              <p>Your name must match exactly what was entered at booking.</p>
            </div>
          </details>

          <details id="transfer-in-progress" className="rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-ink marker:content-none">
              What Happens During the Transfer Stage?
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Right after payment, your reservation moves into Transfer in progress.</p>
              <p>This is the step where the owner updates Disney's system.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>The reservation is being placed into your name</li>
                <li>The confirmation number is temporarily inactive</li>
                <li>No action is required from you</li>
              </ul>
              <p>Your dashboard keeps you updated:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Transfer in progress</li>
                <li>Then Ready to link once complete</li>
              </ul>
              <p>
                If more than 48 hours pass without an update, you are welcome to reach out, but most transfers are completed quickly. This is a procedural step, not a risk.
              </p>
            </div>
          </details>
        </section>

        <section>
          <Card className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-700">
              Looking for available inventory?{" "}
              <Link href="/ready-stays" className="font-semibold text-ink underline underline-offset-4">
                Browse Ready Stays
              </Link>
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
