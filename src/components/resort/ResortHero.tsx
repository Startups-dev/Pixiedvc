import Image from "next/image";
import ResortChip from "./ResortChip";

type Props = {
  name: string;
  tagline: string;
  heroImage: string;
  chips: string[];
};

export default function ResortHero({ name, tagline, heroImage, chips }: Props) {
  return (
    <section className="relative overflow-hidden bg-[#0F2148] text-white">
      <Image
        src={heroImage}
        alt={`${name} hero`}
        fill
        priority
        className="object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_20%,transparent_20%,rgba(10,14,30,0.5)_70%,rgba(10,14,30,0.85)_100%)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <h1 className="mb-2 text-4xl font-serif md:text-5xl">{name}</h1>
        <p className="mb-5 max-w-2xl text-base text-white/85 md:text-lg">{tagline}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <ResortChip key={chip} label={chip} variant="light" />
          ))}
        </div>
        <div className="mt-3 text-xs text-white/70">
          ★★★★☆ 4.8 <span className="ml-2 text-white/60">Guest favorite</span>
        </div>
      </div>
    </section>
  );
}
