"use client";

import { useMemo, useState } from "react";
import {
  Share2,
  Mail,
  MessageSquareText,
  Link as LinkIcon,
  MessageCircle,
  Facebook,
  Instagram,
  Video,
} from "lucide-react";

export default function EstimateShareControl() {
  const sharePayload = useMemo(
    () => ({
      title: "PixieDVC estimate",
      url: "https://pixiedvc.com/estimate/demo",
      text:
        "Bay Lake Tower at Disney’s Contemporary Resort — Standard View\n" +
        "Deluxe Studio · 4 nights\n" +
        "June 18–22, 2026\n\n" +
        "72 points · $1,656 est.\n" +
        "Estimated at $23/pt (7-month window).\n" +
        "Shared from PixieDVC\n" +
        "https://pixiedvc.com/estimate/demo",
    }),
    [],
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function openShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: sharePayload.title,
          text: sharePayload.text,
          url: sharePayload.url,
        })
        .catch(() => {});
      return;
    }
    setShareOpen((prev) => !prev);
  }

  async function copyToClipboard(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
      window.setTimeout(() => setToast(null), 1500);
    } catch {
      setToast(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openShare}
        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-semibold text-[#0B1B3A]/70 transition hover:text-[#0B1B3A]"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share estimate
      </button>
      {shareOpen ? (
        <div className="absolute right-0 top-10 z-10 w-[320px] rounded-2xl border border-ink/10 bg-white/95 p-4 text-sm text-[#0B1B3A]/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-3 gap-3">
            <a
              className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
              href={`sms:?&body=${encodeURIComponent(sharePayload.text)}`}
            >
              <MessageSquareText className="h-4 w-4" />
              Text
            </a>
            <a
              className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
              href={`mailto:?subject=${encodeURIComponent(
                sharePayload.title,
              )}&body=${encodeURIComponent(sharePayload.text)}`}
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
            <a
              className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
              href={`https://wa.me/?text=${encodeURIComponent(sharePayload.text)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                sharePayload.url,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </a>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(sharePayload.text, "Link copied. Paste into Instagram.")
              }
              className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
            >
              <Instagram className="h-4 w-4" />
              Instagram
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(sharePayload.text, "Link copied. Paste into TikTok.")}
              className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
            >
              <Video className="h-4 w-4" />
              TikTok
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(sharePayload.url, "Estimate copied to clipboard.")}
              className="col-span-3 flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
            >
              <LinkIcon className="h-4 w-4" />
              Copy link
            </button>
          </div>
        </div>
      ) : null}
      {toast ? <p className="mt-2 text-xs text-[#0B1B3A]/70">{toast}</p> : null}
    </div>
  );
}
