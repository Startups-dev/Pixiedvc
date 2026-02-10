import Link from "next/link";

const sections = [
  {
    id: "about",
    title: "1. About PixieDVC",
    body: [
      "PixieDVC is an independent Disney Vacation Club (DVC) rental marketplace.",
      "We connect Disney Vacation Club owners with guests seeking accommodations at DVC resorts.",
      "PixieDVC is not affiliated with, endorsed by, or sponsored by The Walt Disney Company or Disney Vacation Club.",
    ],
  },
  {
    id: "service",
    title: "2. Nature of the Service",
    body: [
      "PixieDVC facilitates reservations by matching guest requests with available DVC owner points. We do not own, operate, or control Disney resorts, nor do we issue Disney products.",
      "All reservations are subject to:",
    ],
    bullets: [
      "Owner availability",
      "Disney Vacation Club rules and policies",
      "Confirmation at the time of booking",
    ],
  },
  {
    id: "use",
    title: "3. Use of the Site",
    body: [
      "You agree to use the Site only for lawful purposes and in a respectful manner.",
      "You may not:",
    ],
    bullets: [
      "Submit false or misleading information",
      "Impersonate another person or entity",
      "Attempt to disrupt, damage, or misuse the Site",
      "Upload or transmit harmful, abusive, or illegal content",
    ],
    footer:
      "We reserve the right to suspend or terminate access if these Terms are violated.",
  },
  {
    id: "ip",
    title: "4. Intellectual Property",
    body: [
      "All content on the Site—including text, images, branding, and design—is owned by PixieDVC or its licensors and is protected by applicable intellectual property laws.",
      "You may not copy, reproduce, distribute, or exploit Site content without prior written permission.",
    ],
  },
  {
    id: "reservations",
    title: "5. Reservations, Payments & Confirmations",
    body: [
      "Reservation requests are not confirmed bookings until explicitly confirmed by PixieDVC.",
      "Once a booking is confirmed and points are allocated, it becomes binding.",
      "Prices, availability, and resort details may change prior to confirmation.",
    ],
  },
  {
    id: "refunds",
    title: "6. Refunds & Cancellations",
    body: [
      "Because DVC point reservations are tied to owner-allocated points:",
      "Confirmed reservations are generally non-refundable.",
      "Changes or cancellations after confirmation are typically not possible.",
      "Prior to confirmation, requests may be modified or withdrawn.",
      "We strongly recommend purchasing third-party travel insurance to protect against unforeseen circumstances.",
    ],
  },
  {
    id: "third-party",
    title: "7. Third-Party Services & Links",
    body: [
      "The Site may reference or link to third-party services (including Disney systems). PixieDVC is not responsible for the content, availability, or actions of third parties.",
    ],
  },
  {
    id: "disclaimer",
    title: "8. Disclaimer of Warranties",
    body: ["The Site and services are provided “as is” and “as available.”", "We make no guarantees regarding uninterrupted service, availability, or error-free operation."],
  },
  {
    id: "liability",
    title: "9. Limitation of Liability",
    body: ["To the fullest extent permitted by law, PixieDVC shall not be liable for:"],
    bullets: [
      "Resort closures, refurbishments, or Disney policy changes",
      "Travel interruptions, weather events, or force majeure",
      "Losses arising from use or inability to use the Site",
    ],
    footer: "Your sole remedy for dissatisfaction is to discontinue use of the Site.",
  },
  {
    id: "indemnification",
    title: "10. Indemnification",
    body: [
      "You agree to indemnify and hold PixieDVC harmless from any claims arising out of your use of the Site, violation of these Terms, or infringement of third-party rights.",
    ],
  },
  {
    id: "changes",
    title: "11. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. Continued use of the Site constitutes acceptance of the updated Terms.",
    ],
  },
  {
    id: "law",
    title: "12. Governing Law",
    body: [
      "These Terms are governed by the laws of the jurisdiction in which PixieDVC operates, without regard to conflict-of-law principles.",
    ],
  },
  {
    id: "contact",
    title: "13. Contact",
    body: ["For questions regarding these Terms:"],
  },
];

export default function TermsPage() {
  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-4xl px-6 pb-12 pt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#0F2148]/60">PixieDVC — Terms of Service</p>
        <h1 className="mt-3 text-4xl font-serif sm:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-[#0F2148]/70">Last updated: December 2025</p>
        <p className="mt-6 text-base leading-7 text-[#0F2148]/80">
          Welcome to PixieDVC. These Terms of Service (“Terms”) govern your use of the PixieDVC website and services (the “Site”), operated independently by PixieDVC (“we,” “us,” or “our”).
        </p>
        <p className="mt-4 text-base leading-7 text-[#0F2148]/80">
          By accessing or using this Site, you agree to be bound by these Terms. If you do not agree, please do not use the Site.
        </p>
      </section>

      <section className="mx-auto max-w-4xl space-y-8 px-6 pb-16">
        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">{section.title}</h2>
            {section.body?.map((line) => (
              <p key={line} className="text-sm leading-6 text-[#0F2148]/80">
                {line}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.footer && (
              <p className="text-sm leading-6 text-[#0F2148]/80">{section.footer}</p>
            )}
            {section.id === "contact" && (
              <div className="text-sm text-[#0F2148]/80">
                <p>PixieDVC</p>
                <p>
                  <span className="mr-2">📧</span>
                  <Link href="mailto:hello@pixiedvc.com" className="underline underline-offset-4">
                    hello@pixiedvc.com
                  </Link>
                </p>
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
