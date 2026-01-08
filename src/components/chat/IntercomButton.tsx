"use client";

import { useState } from "react";

import { openIntercom } from "@/lib/intercom";

type IntercomButtonProps = {
  label: string;
  className?: string;
  showStatus?: boolean;
  asTextLink?: boolean;
};

export default function IntercomButton({ label, className, showStatus = false }: IntercomButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  const handleClick = () => {
    const opened = openIntercom();
    if (!opened) {
      setStatus("Chat loading…");
      setTimeout(() => setStatus(null), 2500);
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button type="button" onClick={handleClick} className={className}>
        {label}
      </button>
      {showStatus && status ? <span className="mt-2 text-xs text-slate-500">{status}</span> : null}
    </div>
  );
}
