export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  blurb?: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "booking-availability",
    title: "Booking & Availability",
    items: [
      {
        question: "What is a Disney Vacation Club (DVC) rental?",
        answer:
          "Disney Vacation Club is Disney's vacation ownership program that uses points for stays at Deluxe Disney Resorts. A DVC rental lets you stay at these resorts by renting points from a DVC Member, without purchasing a membership yourself. You get deluxe accommodations and Disney resort perks at a lower cost than typical cash rates.",
      },
      {
        question: "How far in advance can I book?",
        answer:
          "DVC stays can be booked up to 11 months before check-in, depending on the resort and Member booking rules. High-demand resorts and room types can sell out early, so booking as soon as your dates are set is recommended.",
      },
      {
        question: "Can I check availability online?",
        answer:
          "Live DVC availability is only visible to DVC Members through the DVC member system and does not appear on Disney's public hotel booking site. We can check availability for you. Pricing tools estimate cost but do not show availability.",
      },
      {
        question: "Can I book multiple rooms or a split stay?",
        answer:
          "Yes. Each room requires a separate request and deposit, and each room receives its own confirmation. Guest lists must be unique per room. Split stays must not overlap. You can tell us whether multiple requests are contingent (book all or none) or non-contingent (book independently).",
      },
    ],
  },
  {
    id: "pricing-payments",
    title: "Pricing & Payments",
    items: [
      {
        question: "How do I find pricing for my stay?",
        answer:
          "Use our free online Cost Calculator to see the total accommodation cost for your selected dates, including applicable fees and taxes. A $99 refundable request deposit is required to submit a reservation request. The deposit is applied toward your final balance if the reservation is confirmed and fully refunded if we're unable to secure the requested stay. The calculator does not reflect availability.",
      },
      {
        question: "Are there hidden fees?",
        answer:
          "We don't add hidden fees. Some U.S. credit card issuers may apply a foreign transaction fee for cross-border purchases, check your card's policy.",
      },
      {
        question: "Are there any extra taxes at check-out for certain resorts?",
        answer:
          "Some destinations charge local accommodation taxes at check-out. This commonly applies to Aulani (Hawaii) and Disneyland-area stays (California). See the resort information page for current estimates.",
      },
      {
        question: "How does payment work?",
        answer:
          "After you submit your request, you'll pay a $99 refundable request deposit. This deposit allows our team to actively work your request with verified DVC Owners and is fully refunded if we're unable to secure your reservation. Once the reservation is confirmed, the remaining balance is due within 24 hours. You'll receive a Rental Agreement, and payment in full confirms acceptance. We accept Visa/Mastercard and PayPal.",
      },
    ],
  },
  {
    id: "changes-cancellations-insurance",
    title: "Changes, Cancellations & Insurance",
    items: [
      {
        question: "What is your cancellation policy?",
        answer:
          "If you cancel before a reservation is secured, your $99 refundable request deposit is returned. Once confirmed, cancellation options are limited due to owner-owned points. See our Cancellation Policy page for full terms.",
      },
      {
        question: "Do you provide travel insurance?",
        answer:
          "We don't sell travel insurance. We strongly recommend third-party travel insurance to protect flights, tickets, and other trip components. Some accommodation credits may be available depending on the reservation date and policy terms.",
      },
      {
        question: "Can I change my details after my reservation is secured?",
        answer:
          "Some minor updates may be possible with advance notice, but key items, like lead guest name, travel dates, and resort/room/view, cannot be changed once secured. Please provide at least 30 days' notice for any allowed updates.",
      },
    ],
  },
  {
    id: "disney-accounts-perks",
    title: "Disney Accounts & Guest Perks",
    items: [
      {
        question: "Is my rental an official Disney reservation?",
        answer:
          "Yes. A points reservation is a legitimate Disney Resort reservation booked in your name when secured successfully.",
      },
      {
        question: "Can I link my reservation to My Disney Experience?",
        answer:
          "Yes. After confirmation, you'll receive a Disney reservation number. You can link it to My Disney Experience for Walt Disney World. Some destinations use different platforms (e.g., Disneyland or Aulani). Make sure the lead guest name and email match your Disney account exactly.",
      },
      {
        question: "What is included with a DVC rental?",
        answer:
          "Accommodations only. You receive standard Disney Resort guest benefits like transportation, dining booking access, and eligibility for certain deluxe-guest perks (when offered). DVC member-only discounts and lounge access are not included.",
      },
      {
        question: "Will I receive daily housekeeping?",
        answer:
          "Daily housekeeping is not included. Stays typically include scheduled Trash & Towel service and periodic full cleaning depending on length of stay. Additional housekeeping may be purchased through the resort.",
      },
    ],
  },
  {
    id: "tickets-dining-extras",
    title: "Tickets, Dining & Extras",
    items: [
      {
        question: "Can I purchase park tickets through you?",
        answer:
          "Park tickets are purchased through Disney's official channels. Once purchased, you can link tickets to your Disney account and connect them to your stay.",
      },
      {
        question: "How can I add a Disney Dining Plan?",
        answer:
          "For eligible Walt Disney World stays, Dining Plans can be added after your reservation is secured and must be requested at least 30 days before check-in. Dining reservations typically open 60 days before arrival.",
      },
    ],
  },
  {
    id: "deals-support",
    title: "Deals & Support",
    items: [
      {
        question: "Do you offer sales or last-minute deals?",
        answer:
          "DVC rentals already offer significant savings versus cash rates. Sometimes last-minute availability or pre-confirmed stays may be listed at special pricing. Inventory varies.",
      },
      {
        question: "How can I contact you if I still have questions?",
        answer:
          "Contact our team by phone, email, or live chat during posted support hours. We're happy to help with resort selection, dates, and general planning questions.",
      },
    ],
  },
];
