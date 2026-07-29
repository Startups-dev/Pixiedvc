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
    blurb: "How Disney villa booking works, availability timing, and reservation requests.",
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
        question: "How far in advance should I book?",
        answer:
          "Many Disney Vacation Club resorts book far in advance, especially for larger villas, peak seasons, and high-demand resorts. Earlier planning generally improves availability and pricing flexibility.",
      },
      {
        question: "Can I check availability online?",
        answer:
          "Live DVC availability is only visible to DVC Members through the DVC member system and does not appear on Disney's public hotel booking site. We can check availability for you. Pricing tools estimate cost but do not show availability.",
      },
      {
        question: "How likely is my request to be confirmed?",
        answer:
          "Availability depends on resort demand, travel dates, room type, and booking timing. Flexible dates and resort choices generally improve confirmation chances. Our concierge team actively works with verified owners to maximize successful matches.",
      },
      {
        question: "What happens if my request cannot be confirmed?",
        answer:
          "If your requested stay cannot be secured, your deposit can typically be applied toward alternate options or refunded according to the booking terms presented before checkout.",
      },
      {
        question: "Can I request multiple resort options?",
        answer:
          "Yes. During the booking process you may provide alternate resort or room preferences to improve flexibility and confirmation chances.",
      },
      {
        question: "Can I book multiple rooms or a split stay?",
        answer:
          "Yes. Guests may submit separate requests for multiple rooms or split stays. Our concierge team can help coordinate availability and booking strategies for more complex Disney villa itineraries.",
      },
    ],
  },
  {
    id: "pricing-payments",
    title: "Pricing & Payments",
    blurb: "What to expect around estimates, deposits, final balances, and accommodation taxes.",
    items: [
      {
        question: "How do I find pricing for my stay?",
        answer:
          "Use our free online Cost Calculator to see the total accommodation cost for your selected dates, including applicable fees and taxes. A $99 refundable request deposit is required to submit a reservation request. The deposit is applied toward your final balance if the reservation is confirmed and fully refunded if we're unable to secure the requested stay. The calculator does not reflect availability.",
      },
      {
        question: "What is HannaDVC’s price per point?",
        answer:
          "HannaDVC guest pricing is based on four Access tiers:\n\nPremier Access — $29 per point\nPriority Access — $26 per point\nSelect Access — $24 per point\nValue Access — $22 per point\n\nThe tier depends on the resort, booking window, room demand, and whether the stay is matched through owner points or offered as a pre-confirmed stay. Your calculator estimate will show the tier and per-point price used before you submit a request.",
      },
      {
        question: "Why are Disney villa rentals cheaper than booking directly through Disney?",
        answer:
          "HannaDVC reservations are booked using Disney Vacation Club points from verified DVC Members instead of Disney’s standard cash pricing. Because of this, many deluxe Disney villas can cost significantly less than booking directly through Disney.",
      },
      {
        question: "Why do prices vary between resorts and dates?",
        answer:
          "Disney Vacation Club pricing changes based on resort popularity, room type, travel season, booking timing, and overall demand. Lower-demand periods and flexible travel dates can often provide better value.",
      },
      {
        question: "What is included in the estimated price?",
        answer:
          "Your estimate includes the Disney villa reservation booked through HannaDVC. Taxes collected directly by Disney Resorts at check-in, optional travel insurance, and other vacation expenses are not included unless specifically stated.",
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
          "After you submit your request, you'll pay a $99 refundable request deposit. This deposit allows our team to actively work your request with verified DVC Owners and is fully refunded if we're unable to secure your reservation. Once the reservation is confirmed, the remaining balance is due within 24 hours. You'll receive a Rental Agreement, and payment in full confirms acceptance. We accept major credit and debit cards through Stripe.",
      },
      {
        question: "When is the remaining balance due?",
        answer:
          "Once your request is matched and availability is confirmed, the remaining balance is due along with acceptance of the Rental Agreement. After payment is completed, the reservation is finalized and booked into Disney’s system.",
      },
      {
        question: "Can I save thousands compared to booking through Disney?",
        answer:
          "In many cases, yes. Disney Vacation Club rentals can offer deluxe Disney villa accommodations at significantly lower pricing than Disney’s standard cash rates.",
      },
    ],
  },
  {
    id: "changes-cancellations-insurance",
    title: "Changes, Cancellations & Insurance",
    blurb: "Key details on cancellation timing, changes after confirmation, and trip protection.",
    items: [
      {
        question: "What is your cancellation policy?",
        answer:
          "Your $99 request deposit remains refundable while HannaDVC is still attempting to match your request and confirm availability.\n\nOnce a matching owner is secured, availability is confirmed, and a Rental Agreement is generated for your stay, the deposit becomes non-refundable, even if the reservation has not yet been finalized in Disney’s system.\n\nOnce your reservation is confirmed and payment is completed, cancellation flexibility depends on the specific terms presented for your booking, including any eligible Deferred Cancellation Credit or rebooking options.\n\nBefore committing, you will always be shown the full reservation price, payment terms, cancellation terms specific to your stay, and any available flexibility options. HannaDVC concierge support remains available to help explore eligible rebooking, adjustment, or travel credit options if your plans change.",
      },
      {
        question: "Why are DVC rental cancellations more restrictive?",
        answer:
          "Disney Vacation Club reservations are booked using owner points that are subject to usage windows and restrictions. Unlike traditional hotel inventory, these reservations often cannot be easily resold or refunded once confirmed.",
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
    blurb: "Official Disney confirmation details, My Disney Experience linking, and what is included.",
    items: [
      {
        question: "Is my rental an official Disney reservation?",
        answer:
          "Yes. A points reservation is a legitimate Disney Resort reservation booked in your name when secured successfully.",
      },
      {
        question: "Are these official Disney Resort reservations?",
        answer:
          "Yes. DVC rentals are booked directly into Disney’s reservation system and are official Disney Resort stays.",
      },
      {
        question: "Can I link my reservation to My Disney Experience?",
        answer:
          "Yes. After confirmation, you'll receive a Disney reservation number. You can link it to My Disney Experience for Walt Disney World. Some destinations use different platforms (e.g., Disneyland or Aulani). Make sure the lead guest name and email match your Disney account exactly.",
      },
      {
        question: "Can I use Disney transportation and resort amenities?",
        answer:
          "Yes. DVC rentals are official Disney Resort reservations and include access to Disney transportation, pools, resort amenities, and other eligible resort guest benefits available during your stay.",
      },
      {
        question: "Will my reservation appear in the My Disney Experience app?",
        answer:
          "Yes. Once your reservation is secured and linked, it can appear in your My Disney Experience account similarly to a standard Disney Resort reservation.",
      },
      {
        question: "Do I need to attend a timeshare presentation?",
        answer:
          "No. HannaDVC rentals do not require attendance at any Disney Vacation Club presentation or sales meeting.",
      },
      {
        question: "Can I use MagicBands and Lightning Lane?",
        answer:
          "Yes. Once your reservation is linked to your Disney account, you can generally use MagicBands, Lightning Lane selections, and other eligible Disney planning features available to resort guests.",
      },
      {
        question: "What is included with a DVC rental?",
        answer:
          "Accommodations only. You receive standard Disney Resort guest benefits like transportation, dining booking access, and eligibility for certain deluxe-guest perks (when offered). DVC member-only discounts and lounge access are not included.",
      },
      {
        question: "Do I earn Disney hotel points or loyalty benefits?",
        answer:
          "Disney Vacation Club rentals are not eligible for Disney hotel loyalty points, promotions, or certain direct-booking benefits offered through Disney.",
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
    blurb: "What to know about tickets, dining plans, and extra planning items around your stay.",
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
    blurb: "Ready Stays, special opportunities, and how to reach HannaDVC for planning help.",
    items: [
      {
        question: "Do you offer sales or last-minute deals?",
        answer:
          "DVC rentals already offer significant savings versus cash rates. Sometimes last-minute availability or pre-confirmed stays may be listed at special pricing. Inventory varies.",
      },
      {
        question: "What does “Price reduced” mean on a Ready Stay?",
        answer:
          "A “Price reduced” Ready Stay means the owner has lowered the price of an existing reservation to make it more attractive.\n\nYou still get:\n- the same confirmed stay\n- the same booking protections\n- the same booking process\n\nOnly the price has been reduced.",
      },
      {
        question: "What are Limited-Time Disney Villa Deals?",
        answer:
          "Some Disney villa stays may become available at reduced pricing when an owner has points approaching expiration or wants to secure a faster booking.\n\nThese opportunities can include Ready Stays or flexible booking inventory and may offer exceptional value for travelers with flexible plans.\n\nSome limited-time offers may only be shared through the HannaDVC newsletter before becoming publicly available.\n\nAvailability is limited and deals may disappear quickly once booked.",
      },
      {
        question: "Can your concierge team help me choose a resort?",
        answer:
          "Yes. Our concierge team can help compare resorts, room types, pricing windows, transportation access, and booking strategies based on the kind of Disney trip you are planning.",
      },
    ],
  },
];
