"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { resolveResortImage } from "@/lib/resort-image";

const calculatorHeroImages = [
  resolveResortImage({ resortSlug: "aulani", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "bay-lake-tower", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "beach-club-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "boardwalk-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "boulder-ridge-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "copper-creek-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "grand-floridian-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "grand-californian-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "disneyland-hotel-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "hilton-head-island", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "old-key-west", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "polynesian-villas", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "riviera-resort", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "saratoga-springs", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "vero-beach", imageIndex: 1 }).url,
  resolveResortImage({ resortSlug: "animal-kingdom-villas", imageIndex: 1 }).url,
];

const fallbackHeroImage = resolveResortImage({ resortSlug: "riviera-resort", imageIndex: 1 }).url;

function pickRandomImage() {
  if (!calculatorHeroImages.length) return fallbackHeroImage;
  const index = Math.floor(Math.random() * calculatorHeroImages.length);
  return calculatorHeroImages[index] ?? fallbackHeroImage;
}

export default function CalculatorHeroImage() {
  const searchParams = useSearchParams();
  const [heroImage, setHeroImage] = useState(fallbackHeroImage);

  useEffect(() => {
    const resortFromQuery = searchParams.get("resort");
    const resortHint = resortFromQuery?.trim() || null;

    if (resortHint) {
      const matched = resolveResortImage({ resortSlug: resortHint, resortCode: resortHint, imageIndex: 1 });
      if (matched.matchedBy !== "default") {
        setHeroImage(matched.url);
        return;
      }
    }

    const randomImage = pickRandomImage();
    setHeroImage(randomImage);
  }, [searchParams]);

  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center [filter:contrast(1.03)_saturate(1.02)]"
        style={{ backgroundImage: `url('${heroImage}')` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(10,20,40,0.75)_0%,rgba(10,20,40,0.55)_30%,rgba(10,20,40,0.25)_60%,rgba(10,20,40,0.05)_100%),linear-gradient(180deg,rgba(11,31,68,0.32)_0%,rgba(11,31,68,0.18)_38%,rgba(248,246,242,0.06)_72%,rgba(248,246,242,0)_100%)]" />
    </>
  );
}
