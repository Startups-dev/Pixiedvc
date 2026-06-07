type PixieLogoProps = {
  className?: string;
  priority?: boolean;
};

const PIXIEDVC_LOGO_URL = "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/icons/Text%20Styling%20Pixie%20in%20White.svg";

export default function PixieLogo({ className, priority = false }: PixieLogoProps) {
  return (
    <img
      src={PIXIEDVC_LOGO_URL}
      alt="PixieDVC"
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
    />
  );
}
