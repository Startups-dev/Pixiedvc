type GuideImagePlaceholderProps = {
  aspect: "16/9" | "4/3" | "1/1" | "3/2";
  label: string;
  note?: string;
  caption?: string;
  priority?: boolean;
  src?: string;
  alt?: string;
};

const ASPECT_CLASS: Record<GuideImagePlaceholderProps["aspect"], string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
};

export default function GuideImagePlaceholder({
  aspect,
  label,
  note,
  caption,
  src,
  alt,
}: GuideImagePlaceholderProps) {
  return (
    <figure>
      <div
        className={`relative overflow-hidden rounded-2xl border border-[#0F2148]/12 bg-gradient-to-br from-[#EEF2F8] to-[#F8FAFC] ${ASPECT_CLASS[aspect]}`}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? label}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-sm font-semibold text-[#0F2148]/80">{label}</p>
              {note ? <p className="mt-2 text-xs text-[#0F2148]/60">{note}</p> : null}
            </div>
          </div>
        )}
      </div>
      {caption ? <figcaption className="mt-2 text-xs text-[#0F2148]/55">{caption}</figcaption> : null}
    </figure>
  );
}
