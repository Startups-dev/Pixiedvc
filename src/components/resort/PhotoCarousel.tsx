import Image from "next/image";

type Props = {
  photos: { src: string; caption: string; alt?: string }[];
};

export default function PhotoCarousel({ photos }: Props) {
  const hasPhotos = photos.length > 0;

  return (
    <section id="gallery" className="relative bg-[#f9f7f4] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-2xl font-serif text-[#0F2148]">Explore the Resort</h2>
        {hasPhotos ? (
          <div className="flex gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((photo, index) => (
              <figure
                key={`${photo.src}-${photo.caption}-${index}`}
                className="relative h-[210px] w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md md:h-[230px] md:w-[340px]"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt ?? photo.caption}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
                <figcaption className="absolute bottom-0 w-full bg-gradient-to-t from-black/60 to-transparent p-3 text-xs text-white md:text-sm">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#0F2148]/20 bg-white/70 p-8 text-sm text-[#0F2148]/60">
            Photo tour coming soon.
          </div>
        )}
      </div>
    </section>
  );
}
