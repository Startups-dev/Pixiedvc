"use client";

import { useEffect, useId, useRef, useState } from "react";

const countries = ["United States", "Canada", "United Kingdom", "Mexico", "Brazil", "Australia"] as const;

type CountrySelectProps = {
  id: string;
  value: string;
  onChange: (country: string) => void;
  onBlur: () => void;
  inputRef?: (element: HTMLButtonElement | null) => void;
  invalid?: boolean;
};

export function CountrySelect({ id, value, onChange, onBlur, inputRef, invalid = false }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const selectedIndex = Math.max(0, countries.findIndex((country) => country === value));
  const choose = (country: string) => {
    onChange(country);
    onBlur();
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative z-10 mt-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          onBlur();
        }
      }}
    >
      <button
        id={id}
        ref={(element) => {
          triggerRef.current = element;
          inputRef?.(element);
        }}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(selectedIndex);
            setOpen(true);
          }
        }}
      >
        <span>{value || "Select a country"}</span>
        <span aria-hidden="true" className="ml-3 text-slate-500">⌄</span>
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Country"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          {countries.map((country, index) => (
            <button
              key={country}
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              role="option"
              aria-selected={value === country}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-900 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
              onClick={() => choose(country)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) => (current + (event.key === "ArrowDown" ? 1 : countries.length - 1)) % countries.length);
                } else if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  setActiveIndex(event.key === "Home" ? 0 : countries.length - 1);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  triggerRef.current?.focus();
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  choose(country);
                }
              }}
            >
              {country}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
