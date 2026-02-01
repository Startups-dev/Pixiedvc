"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";

type Props = {
  name: string;
  location: string;
  vibe: string;
  points: string;
  image: string;
  micro: string;
  slug: string;
};

export default function ResortCollectionCard({
  name,
  location,
  vibe,
  points,
  image,
  micro,
  slug,
}: Props) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_22px_50px_rgba(15,23,42,0.12)] transition duration-200 ease-out hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_32px_70px_rgba(15,23,42,0.18)] focus-within:ring-2 focus-within:ring-brand/20">
      <Link
        href={`/resorts/${slug}#gallery`}
        className="absolute inset-0 z-0"
        aria-label={`View ${name}`}
      />
      <div className="absolute right-4 top-4 z-20 opacity-0 transition duration-150 ease-out group-hover:opacity-100 group-hover:scale-[1.03]">
        <button
          type="button"
          onClick={() => setSaved((prev) => !prev)}
          aria-pressed={saved}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[#0B1B3A]/70 shadow-[0_8px_18px_rgba(11,27,58,0.15)] backdrop-blur"
        >
          <Bookmark
            className={saved ? "h-4 w-4 text-[#BFA76A]" : "h-4 w-4 text-white/80"}
            strokeWidth={1.6}
            fill={saved ? "#BFA76A" : "none"}
          />
        </button>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#A7F3D022,transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative h-[64px] w-full overflow-hidden rounded-t-2xl">
          <Image
            src={image}
            alt={`${name} preview`}
            fill
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-transparent" />
        </div>
      </div>
      <div className="relative z-10 mt-5 space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-brand">{location}</p>
        <h3 className="font-display text-2xl text-ink">{name}</h3>
        <p className="text-sm text-muted">{vibe}</p>
        <p className="text-xs text-[#0B1B3A]/60">{micro}</p>
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/5 px-4 py-2 text-xs font-semibold text-brand/80">
          {points}
        </div>
      </div>
    </div>
  );
}
