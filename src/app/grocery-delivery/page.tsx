import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";

const HERO_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/Vacation%20Grocery%20Delivery.png";

const PARTNER_LOGO =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/VacationGroceryDeliverylogo.png";

const PARTNER_URL = "https://www.vacationgrocerydeliveryfl.com";

const TRUST_POINTS = [
  "Recommended by HannaDVC for Disney resort stays",
  "Familiar with Disney resort delivery procedures",
  "Ideal for DVC villas and standard resort rooms",
];

const BENEFITS = [
  "Fresh groceries",
  "Bottled water",
  "Breakfast items",
  "Snacks and drinks",
  "Baby supplies",
  "Resort delivery experience",
];

const STEPS = [
  "Place your grocery order before arrival.",
  "Choose your Disney resort, arrival timing, and vacation essentials.",
  "Your order is handled according to Disney resort procedures so you can arrive with one less stop to make.",
];

export const metadata = {
  title: "Grocery Delivery Guide | HannaDVC",
  description:
    "Disney resort grocery delivery made easy with a concierge-style planning guide from HannaDVC.",
};

export default function GroceryDeliveryGuidePage() {
  return (
    <main className="bg-[linear-gradient(180deg,#f6f9ff_0%,#ffffff_22%,#f9fbff_100%)] text-[#0F2148]">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-[#0B1B3A]/10 bg-[#071a33] shadow-[0_28px_70px_rgba(15,33,72,0.18)] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10 flex flex-col justify-between gap-8 px-6 py-8 text-white sm:px-8 sm:py-10">
            <div className="space-y-5">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">
                HannaDVC Guest Guide
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight !text-white sm:text-5xl">
                  Disney Resort Grocery Delivery Made Easy
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                  Skip the grocery store and start your vacation sooner. Have groceries, snacks,
                  drinks, baby supplies, and vacation essentials delivered directly to your Disney resort.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {TRUST_POINTS.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-white/88 backdrop-blur-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={PARTNER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full bg-[linear-gradient(180deg,#f5c965,#d9a53a)] px-5 py-3 text-sm font-semibold !text-[#102554] shadow-[0_16px_34px_rgba(217,165,58,0.28)] transition hover:brightness-105"
                >
                  Order with Our Recommended Partner
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center rounded-full border border-white/24 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  Learn How Delivery Works
                </Link>
              </div>
            </div>
          </div>

          <div className="relative min-h-[300px] overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(7,26,51,0.18), rgba(7,26,51,0.06)), url('${HERO_IMAGE}')`,
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,26,51,0.74)_0%,rgba(7,26,51,0.24)_38%,rgba(7,26,51,0.04)_100%)]" />
            <div className="relative h-full min-h-[300px]" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-[#d9e3f3] bg-white px-6 py-7 shadow-[0_20px_55px_rgba(15,33,72,0.08)] sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-[#0F2148]/55">
              Our Recommended Grocery Delivery Partner
            </div>

            <div className="flex justify-center py-5">
              <Image
                src={PARTNER_LOGO}
                alt="Vacation Grocery Delivery"
                width={480}
                height={160}
                className="h-auto max-h-[134px] w-auto object-contain"
              />
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#0F2148]">
                A Partner Founded by Former Disney Cast Members
              </h2>
              <p className="mt-4 text-base leading-7 text-[#0F2148]/72">
                After years of creating magical experiences for Disney guests, the founders of Vacation Grocery Delivery
                built a service designed to make Disney vacations easier from the moment families arrive. Founded by former
                Disney Cast Members and Disney Cruise Line Cast Members after the pandemic disrupted their Disney careers,
                the company was created as a way to continue serving guests in a meaningful, hospitality-driven way.
              </p>
              <p className="mt-4 text-base leading-7 text-[#0F2148]/72">
                Today, the team brings more than 15 years of combined Disney Cast Member experience, and many of the people
                behind the service are former or current Cast Members themselves. They understand Disney resorts, arrival days,
                guest expectations, and how much smoother a vacation feels when families can skip the grocery run and settle
                in right away. HannaDVC recommends them because their service aligns naturally with the Disney guest experience
                and helps our guests start their vacations with less stress and more ease.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {BENEFITS.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-3 rounded-2xl border border-[#dfe8f7] bg-[#f9fbff] px-4 py-3 text-sm font-medium text-[#0F2148]/80"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#d9a53a]/15 text-[#b58522]">
                      <Check className="h-4 w-4" />
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <Link
                  href={PARTNER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-[#0F2148]/12 bg-[#0F2148] px-5 py-3 text-sm font-semibold !text-white shadow-[0_16px_34px_rgba(15,33,72,0.18)] transition hover:bg-[#132a5c] hover:!text-white"
                >
                  Start Your Grocery Order
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-[#dbe4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-6 shadow-[0_20px_55px_rgba(15,33,72,0.08)] sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#0F2148]/55">
              How It Works
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F2148]">
              Simple enough to understand in seconds
            </h2>
            <p className="mt-3 text-base leading-7 text-[#0F2148]/70">
              The goal is not to add planning complexity. It&apos;s to make arrival easier by placing an order in advance and letting a Disney-experienced provider handle delivery timing around your stay.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className="rounded-[24px] border border-[#dfe7f6] bg-white p-5 shadow-[0_14px_34px_rgba(15,33,72,0.06)]"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#203b78,#152c5b)] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="mt-4 text-base leading-7 text-[#0F2148]/78">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-[#d8e3f4] bg-white p-6 shadow-[0_20px_55px_rgba(15,33,72,0.08)] sm:p-8">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#0F2148]/55">
              FAQ
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F2148]">
              Questions that matter before you place an order
            </h2>
          </div>

          <div className="mt-8">
            <Accordion className="divide-black/8 border-[#d8e3f4] bg-white">
              <AccordionItem
                title="Can groceries be delivered to Disney resorts?"
                defaultOpen
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                Yes. Many Disney resort guests use grocery delivery for water, breakfast items, snacks, and vacation essentials.
                Delivery timing and drop-off procedures depend on the resort, which is why an experienced Disney-focused provider matters.
              </AccordionItem>
              <AccordionItem
                title="Does this work for Disney Vacation Club villas and standard resort rooms?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                Yes. Grocery delivery is especially helpful for Disney Vacation Club villas because kitchens and kitchenettes make it easy to keep breakfasts, drinks, and snacks on hand throughout the stay, but it also works well for standard Disney resort rooms.
              </AccordionItem>
              <AccordionItem
                title="How far in advance should I place my grocery order?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                In most cases, yes. Ordering before arrival gives the best chance of matching your resort check-in timing and helps ensure staples are ready when you need them.
              </AccordionItem>
              <AccordionItem
                title="What happens if my order arrives before I do?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                That depends on the resort and the provider’s delivery timing, which is why Disney resort familiarity matters. Ordering in advance gives the provider the best chance to align your order with resort procedures and your arrival plans.
              </AccordionItem>
              <AccordionItem
                title="Can I order refrigerated or frozen items?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                Many guests use grocery delivery for milk, yogurt, produce, frozen breakfasts, and other perishable items. A provider familiar with Disney resort delivery handling is the best fit for these types of orders.
              </AccordionItem>
              <AccordionItem
                title="Can I order water, drinks, and breakfast staples?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                Yes. Bottled water, coffee supplies, juice, breakfast foods, snacks, and quick in-room essentials are some of the most common items guests order.
              </AccordionItem>
              <AccordionItem
                title="Can I order baby supplies and family essentials?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                Yes. Diapers, wipes, formula, baby snacks, and other family essentials are one of the main reasons guests choose grocery delivery before a Disney trip.
              </AccordionItem>
              <AccordionItem
                title="Are there any Disney resort delivery procedures I should know about?"
                buttonClassName="bg-[#0F2148] text-white"
                titleClassName="!text-white"
                contentClassName="!text-[#0F2148]/78"
                iconClassName="!text-white/78"
              >
                Resort handling can vary, especially around timing and guest arrival. That&apos;s why HannaDVC recommends a provider experienced with Disney resort deliveries rather than a generic grocery drop-off service.
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-[#0F2148]/10 bg-[linear-gradient(135deg,#0f2148_0%,#163162_55%,#1e447f_100%)] p-6 text-white shadow-[0_28px_70px_rgba(15,33,72,0.2)] sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
              Ready to simplify arrival day?
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight !text-white">
              Order through our recommended grocery delivery partner
            </h2>
            <p className="mt-4 text-base leading-7 text-white/82">
              HannaDVC recommends this provider for guests who want a smoother check-in day, better in-room convenience, and a grocery delivery service that understands Disney resort logistics.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={PARTNER_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-[linear-gradient(180deg,#f5c965,#d9a53a)] px-5 py-3 text-sm font-semibold !text-[#102554] shadow-[0_16px_34px_rgba(217,165,58,0.28)] transition hover:brightness-105"
              >
                Order with Our Recommended Partner
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
