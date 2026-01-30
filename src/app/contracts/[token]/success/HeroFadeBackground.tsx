'use client';

type Props = {
  resortSlug?: string | null;
  resortCode?: string | null;
};

export default function HeroFadeBackground({ resortSlug, resortCode }: Props) {
  const baseFolder = '/media/resorts/bay-lake-tower';
  const images = [1, 2, 3, 4, 5].map((index) => `${baseFolder}/hero-${index}.webp`);
  const fallback = '/media/resorts/default/hero.webp';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${fallback})` }}
      />
      {images.map((url, index) => (
        <div
          key={url}
          className="hero-fade absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${url})`,
            animationDelay: `${index * 3}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1b3a] via-[#0b1b3a]/70 to-[#0b1b3a]/10" />
      <style jsx>{`
        .hero-fade {
          opacity: 0;
          animation: heroFade 15s infinite;
        }
        @keyframes heroFade {
          0% {
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          30% {
            opacity: 1;
          }
          38% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
