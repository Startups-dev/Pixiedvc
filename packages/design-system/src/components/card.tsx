import { HTMLAttributes } from "react";

import { cn } from "../utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  surface?: "light" | "dark" | "navy";
};

const surfaceStyles: Record<NonNullable<CardProps["surface"]>, string> = {
  light: "bg-white/85 border border-ink/5",
  dark: "bg-surface-dark/80 border border-white/10 text-white",
  navy: "bg-gradient-to-br from-[#0f172a] to-[#111827] border border-white/10 text-white",
};

export function Card({ className, surface = "light", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[32px] p-6 shadow-[0_30px_70px_rgba(11,14,26,0.18)] backdrop-blur",
        surfaceStyles[surface],
        className,
      )}
      {...props}
    />
  );
}
