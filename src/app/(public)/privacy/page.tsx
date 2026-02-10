import Link from "next/link";

const sections = [
  {
    id: "commitment",
    title: "Our Commitment to Your Privacy",
    body: [
      "At PixieDVC, we respect your privacy and take the protection of your personal information seriously. This Privacy Policy explains how we collect, use, and safeguard information when you visit or interact with our website.",
      "Whether you’re browsing, planning a trip, or requesting a reservation, we aim to be transparent, respectful, and responsible with your data.",
    ],
  },
  {
    id: "collection",
    title: "Information We Collect",
    body: [
      "We do not collect personal information unless you choose to provide it.",
      "You may voluntarily provide information when you:",
    ],
    bullets: [
      "Submit a stay request",
      "Contact us through a form or email",
      "Create an account (if applicable)",
      "Submit a testimonial or feedback",
    ],
    footer: "The types of information we may collect include:",
    bulletsSecondary: [
      "Name",
      "Email address",
      "Travel preferences and dates",
      "Other details you choose to share with us",
    ],
  },
  {
    id: "use",
    title: "How We Use Your Information",
    body: [
      "We use your information only for purposes directly related to providing our services, including:",
    ],
    bullets: [
      "Responding to inquiries",
      "Matching you with available DVC accommodations",
      "Communicating about your request or booking",
      "Improving the PixieDVC experience",
    ],
    footer: "We do not sell your personal information.",
  },
  {
    id: "payments",
    title: "Payments & Third-Party Processors",
    body: [
      "PixieDVC does not store credit card information.",
      "When payments are involved, transactions are handled by trusted third-party payment processors that use industry-standard security measures to protect your data. These providers operate under their own privacy and security policies.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies & Analytics",
    body: [
      "PixieDVC uses cookies to improve site functionality and user experience.",
      "Cookies may be used to:",
    ],
    bullets: [
      "Help the site function properly",
      "Remember preferences",
      "Understand how visitors use the site so we can improve it",
    ],
    footer:
      "Cookies used on this site do not contain sensitive personal information and may be disabled in your browser settings if you prefer.",
  },
  {
    id: "security",
    title: "Data Security",
    body: [
      "We take reasonable technical and organizational measures to protect your information from unauthorized access, misuse, or disclosure.",
      "While no system can be guaranteed 100% secure, we continuously work to maintain appropriate safeguards.",
    ],
  },
  {
    id: "third-party",
    title: "Third-Party Links",
    body: [
      "Our website may link to third-party sites (including Disney-related resources). PixieDVC is not responsible for the privacy practices or content of external websites.",
    ],
  },
  {
    id: "choices",
    title: "Your Choices",
    body: ["You may:"],
    bullets: [
      "Request access to or correction of your personal information",
      "Ask us to delete your information, subject to legal or operational requirements",
      "Opt out of non-essential communications at any time",
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    body: [
      "If you have questions or concerns about this Privacy Policy or how your information is handled, we’re happy to help.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-4xl px-6 pb-12 pt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#0F2148]/60">PixieDVC Privacy Policy</p>
        <h1 className="mt-3 text-4xl font-serif sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[#0F2148]/70">Last updated: December 2025</p>
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
            {section.bulletsSecondary && (
              <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
                {section.bulletsSecondary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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
