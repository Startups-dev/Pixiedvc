"use client";

import dynamic from "next/dynamic";

type Photo = { src: string; caption?: string; alt?: string | null };

const ResortCarousel = dynamic(() => import("./ResortCarousel"), { ssr: false });

export default function ResortCarouselClient({ photos }: { photos: Photo[] }) {
  return <ResortCarousel photos={photos} />;
}
