// src/app/services/grocery/page.tsx

import Link from "next/link";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";

const HERO_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/Vacation%20Grocery%20Delivery.png";

export default function GroceryServicePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl border border-[#0B1B3A]/10 bg-[#071a33] shadow-sm lg:flex">
        <div className="flex flex-col justify-between gap-6 px-6 py-8 text-white lg:w-[52%]">
          <div className="text-xs uppercase tracking-[0.32em] text-white/60">
            PixieDVC Service
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Grocery delivery, handled before you arrive
            </h1>
            <p className="text-sm text-slate-200">
              Fresh groceries delivered to your resort so you can start your
              vacation immediately, no errands, no delivery windows, no stress.
            </p>
            <p className="text-sm text-slate-200">
              Available for Walt Disney World resorts and select nearby hotels.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="https://www.vacationgrocerydeliveryfl.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/50 hover:text-white"
            >
              Request grocery delivery
            </Link>
            <Link
              href="/my-trip"
              className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:text-white"
            >
              View your trip
            </Link>
          </div>
        </div>

        <div className="relative h-[280px] w-full overflow-hidden lg:h-auto lg:flex-1">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
            aria-hidden="true"
          />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071a33] via-[#071a33]/70 to-transparent" />
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-[0.32em] text-[#0B1B3A]/55">
          Trusted partner
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-[#0B1B3A]/70">
          <img
            src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/VacationGroceryDeliverylogo.png"
            alt="Vacation Grocery Delivery"
            className="h-24 w-auto"
          />
          <span className="min-w-0">
            Founded by former Disney Cast Members, Vacation Grocery Delivery brings the
            same guest-focused care and attention to detail that defines the Disney
            experience, making them a natural partner for PixieDVC.
          </span>
        </div>
      </section>

      <section className="mt-10 space-y-6 rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.32em] text-[#0B1B3A]/55">
            Designed with your Disney stay in mind
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
            <div className="text-sm font-semibold text-[#0B1B3A]">
              Personal shopping, handled with care
            </div>
            <p className="mt-2 text-sm text-[#0B1B3A]/70">
              Your grocery list is managed by a dedicated shopper who stays in touch with you throughout the process.
            </p>
          </div>
          <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
            <div className="text-sm font-semibold text-[#0B1B3A]">
              Substitutions made thoughtfully
            </div>
            <p className="mt-2 text-sm text-[#0B1B3A]/70">
              Any replacement items are selected carefully and confirmed with you before checkout.
            </p>
          </div>
          <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
            <div className="text-sm font-semibold text-[#0B1B3A]">
              Delivered in accordance with resort procedures
            </div>
            <p className="mt-2 text-sm text-[#0B1B3A]/70">
              Orders are clearly labeled and delivered directly to Bell Services for proper handling.
            </p>
          </div>
          <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
            <div className="text-sm font-semibold text-[#0B1B3A]">
              Familiar with how Disney resorts operate
            </div>
            <p className="mt-2 text-sm text-[#0B1B3A]/70">
              Experience with resort access, timing, and delivery requirements helps ensure everything goes smoothly.
            </p>
          </div>
          <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4 sm:col-span-2">
            <div className="text-sm font-semibold text-[#0B1B3A]">
              Ready when you arrive
            </div>
            <p className="mt-2 text-sm text-[#0B1B3A]/70">
              Groceries are waiting for you at check-in, so you can begin your stay without added errands or concerns.
            </p>
          </div>
        </div>

        <p className="text-sm text-[#0B1B3A]/70">
          We take care of the details, so you can enjoy the moments that matter.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.32em] text-[#0B1B3A]/55">
            Grocery delivery FAQ
          </div>
          <h2 className="text-2xl font-semibold text-[#0B1B3A]">
            Answers for planning your order
          </h2>
        </header>

        <div className="mt-6">
          <Accordion className="divide-black/10 border-[#0B1B3A]/10 bg-white">
            <AccordionItem
              title="How far in advance should I book?"
              defaultOpen
              buttonClassName="bg-[#071a33] text-white"
              titleClassName="!text-white"
              contentClassName="!text-[#0F2148]/80"
              iconClassName="!text-white/80"
            >
              We recommend booking at least a week in advance. Short-notice deliveries are often possible too—message us
              and we will see what we can accommodate.
            </AccordionItem>
            <AccordionItem
              title="How does delivery work? Do I need to be present?"
              buttonClassName="bg-[#071a33] text-white"
              titleClassName="!text-white"
              contentClassName="!text-[#0F2148]/80"
              iconClassName="!text-white/80"
            >
              At Walt Disney World Resorts, most orders are shopped and delivered the day before your check-in. Groceries
              are delivered directly to Bell Services and stored safely (refrigerated or frozen items included) until you
              arrive.
            </AccordionItem>
            <AccordionItem
              title="What if I have allergies or special dietary needs?"
              buttonClassName="bg-[#071a33] text-white"
              titleClassName="!text-white"
              contentClassName="!text-[#0F2148]/80"
              iconClassName="!text-white/80"
            >
              Stores carry a wide range of gluten-free, dairy-free, top 8-free, and plant-based options. Shoppers are
              trained in handling allergens and can help with special orders for severe dietary needs—just message us
              before you place the order.
            </AccordionItem>
            <AccordionItem
              title="How do I pay?"
              buttonClassName="bg-[#071a33] text-white"
              titleClassName="!text-white"
              contentClassName="!text-[#0F2148]/80"
              iconClassName="!text-white/80"
            >
              After your order is complete, the card on file is charged automatically or an invoice is sent by email or
              text. All major credit cards, including international cards, are accepted.
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#071a33] p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-white">
            Ready to stock up?
          </div>
          <p className="mt-2 text-sm text-white">
            Place your grocery delivery request and arrive to a fully stocked villa.
          </p>
        </div>
        <Link
          href="https://www.vacationgrocerydeliveryfl.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/50 hover:text-white"
        >
          Request grocery delivery
        </Link>
      </section>
    </main>
  );
}
