"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Star } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase-browser";

const FAVORITES_KEY = "pixiedvc_favorite_resorts";
const MAX_FAVORITES = 3;

type Props = {
  resortId: string;
  resortName: string;
};

export default function FavoriteResortToggle({ resortId, resortName }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [promptLogin, setPromptLogin] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [srMessage, setSrMessage] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `${FAVORITES_KEY}_${userId ?? "anon"}`,
    [userId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.("change", updatePreference);
    return () => mediaQuery.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchUser() {
      try {
        const supabase = supabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!isMounted) return;
        setUserId(user?.id ?? null);
      } catch {
        if (!isMounted) return;
        setUserId(null);
      }
    }
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((id) => typeof id === "string"));
        }
      } catch {
        setFavorites([]);
      }
    } else {
      setFavorites([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [favorites, storageKey]);

  useEffect(() => {
    if (!srMessage) return;
    const timeoutId = window.setTimeout(() => setSrMessage(null), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [srMessage]);

  useEffect(() => {
    if (!limitNotice) return;
    const timeoutId = window.setTimeout(() => setLimitNotice(null), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [limitNotice]);

  const isActive = favorites.includes(resortId);

  function toggleFavorite() {
    if (!userId) {
      setPromptLogin(true);
      window.setTimeout(() => setPromptLogin(false), 1800);
    }
    if (!isActive && favorites.length >= MAX_FAVORITES) {
      setSrMessage("You can select up to 3 favorites. Remove one to add another.");
      setLimitNotice("You can save up to 3 favorites.");
      return;
    }
    if (isActive) {
      const next = favorites.filter((id) => id !== resortId);
      setFavorites(next);
      setSrMessage("Removed from favorites");
      return;
    }
    const next = [...favorites, resortId].slice(0, MAX_FAVORITES);
    setFavorites(next);
    setSrMessage("Marked as favorite");
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={isActive}
        aria-label={
          isActive
            ? `Remove ${resortName} from favorites`
            : `Save ${resortName} to favorites`
        }
        className={`group inline-flex min-w-[170px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm cursor-pointer ${
          isActive
            ? "border-white/10 bg-[#0B1B3A] text-white"
            : "border-slate-200/70 bg-white text-slate-900 hover:bg-slate-50"
        } ${
          reduceMotion ? "" : "transition-all duration-150 ease-out hover:scale-[1.03]"
        }`}
      >
        <span
          className={`inline-flex items-center gap-2 ${
            reduceMotion ? "" : "transition-opacity duration-150 ease-out"
          }`}
        >
          <Star
            className={`h-4 w-4 ${isActive ? "text-[#F5D07A]" : "text-slate-600"}`}
            strokeWidth={1.4}
            fill={isActive ? "#F5D07A" : "none"}
          />
          {isActive ? (
            <>
              <Check className="h-3.5 w-3.5 text-white/90" strokeWidth={2} />
              <span>Saved</span>
            </>
          ) : (
            <span>Save as favorite</span>
          )}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {srMessage}
      </span>
      {limitNotice ? (
        <p className="text-[11px] text-[#0B1B3A]/60">{limitNotice}</p>
      ) : null}
      {promptLogin ? (
        <p className="text-[11px] text-[#0B1B3A]/60">Sign in to save favorites</p>
      ) : null}
    </div>
  );
}
