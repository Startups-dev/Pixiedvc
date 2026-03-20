"use client";

import { useState } from "react";

type CopyReferralLinkButtonProps = {
  referralLink: string;
  className?: string;
  label?: string;
};

export default function CopyReferralLinkButton({
  referralLink,
  className = "",
  label = "Copy Link",
}: CopyReferralLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? "Copied" : label}
    </button>
  );
}

