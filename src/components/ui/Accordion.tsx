"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type AccordionProps = {
  children: ReactNode;
  className?: string;
};

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div
      className={`divide-y divide-black/10 rounded-2xl border border-black/10 bg-white ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

type AccordionItemProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  buttonClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  iconClassName?: string;
};

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  buttonClassName,
  titleClassName,
  contentClassName,
  iconClassName,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center justify-between px-5 py-4 text-left ${buttonClassName ?? ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={`font-medium text-[#0F2148] ${titleClassName ?? ""}`}>{title}</span>
        <ChevronDown
          className={`h-5 w-5 text-[#0F2148]/70 transition-transform ${open ? "rotate-180" : ""} ${iconClassName ?? ""}`}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div
          className={`overflow-hidden px-5 pb-4 text-[#0F2148]/80 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"} ${contentClassName ?? ""}`}
          aria-hidden={!open}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
