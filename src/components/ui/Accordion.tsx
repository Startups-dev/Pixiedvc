"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type AccordionProps = {
  children: ReactNode;
};

export function Accordion({ children }: AccordionProps) {
  return <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">{children}</div>;
}

type AccordionItemProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="font-medium text-[#0F2148]">{title}</span>
        <ChevronDown
          className={`h-5 w-5 text-[#0F2148]/70 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden px-5 pb-4 text-[#0F2148]/80">{children}</div>
      </div>
    </div>
  );
}
