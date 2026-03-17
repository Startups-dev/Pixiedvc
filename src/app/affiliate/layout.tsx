import { ReactNode } from "react";
import { affiliatePageShell } from "@/lib/affiliate-theme";

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`pixie-internal-buttons ${affiliatePageShell} [&_a]:text-[#2DD4BF] [&_a:hover]:underline`}>
      {children}
    </div>
  );
}
