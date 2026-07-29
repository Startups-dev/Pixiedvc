import Image from "next/image";

type PixieLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function PixieLogo({ className, priority = false }: PixieLogoProps) {
  return (
    <Image
      src="/images/hannadvc-logo.png"
      alt="HannaDVC"
      width={1962}
      height={802}
      priority={priority}
      className={`h-auto w-[150px] object-contain ${className ?? ""}`}
    />
  );
}
