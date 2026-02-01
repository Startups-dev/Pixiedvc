"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = {
  src: string;
  caption?: string;
  alt?: string | null;
};

type Props = {
  photos: Photo[];
};

export default function ResortCarousel({ photos }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safePhotos = useMemo(() => photos.filter((photo) => Boolean(photo?.src)), [photos]);
  const current = safePhotos[activeIndex] ?? safePhotos[0];

  useEffect(() => {
    if (!safePhotos.length) {
      return;
    }
    if (activeIndex >= safePhotos.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, safePhotos.length]);

  if (!current) {
    return null;
  }

  function goTo(index: number) {
    const total = safePhotos.length;
    if (!total) {
      return;
    }
    const next = ((index % total) + total) % total;
    setActiveIndex(next);
  }

  return (
    <section className="bg-[#0F2148]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="relative overflow-hidden rounded-3xl bg-black/30 shadow-[0_30px_80px_rgba(8,12,30,0.4)]">
          <div className="relative z-0 pointer-events-none h-[320px] w-full sm:h-[520px]">
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt ?? current.caption ?? "Resort image"}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_20%,transparent_30%,rgba(8,12,30,0.65)_100%)]" />
          </div>

          {safePhotos.length > 1 ? (
            <div className="absolute inset-0 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute top-1/2 z-[9999] -translate-y-1/2 rounded-full border border-white/20 bg-black/30 p-2 text-white/90 backdrop-blur transition hover:bg-black/40"
                style={{ left: "104px" }}
                aria-label="Previous resort photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute top-1/2 z-[9999] -translate-y-1/2 rounded-full border border-white/20 bg-black/30 p-2 text-white/90 backdrop-blur transition hover:bg-black/40"
                style={{ right: "104px" }}
                aria-label="Next resort photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-4 right-4 z-10 pointer-events-none rounded-full bg-black/35 px-3 py-1 text-xs text-white/90 backdrop-blur">
                {activeIndex + 1} / {safePhotos.length}
              </div>
            </div>
          ) : null}

        </div>

        {safePhotos.length > 1 ? (
          <div className="relative z-20 mt-4 grid grid-cols-5 gap-3 pointer-events-auto">
            {safePhotos.map((photo, index) => (
              <button
                key={`${photo.src}-${index}`}
                type="button"
                onClick={() => goTo(index)}
                className={`relative h-16 overflow-hidden rounded-2xl border transition sm:h-20 ${
                  index === activeIndex ? "border-white" : "border-white/25"
                }`}
                aria-label={`View photo ${index + 1}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt ?? photo.caption ?? `Resort thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
