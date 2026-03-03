import { ReactNode } from "react";
import { affiliatePageShell } from "@/lib/affiliate-theme";

export default function AffiliateProgramLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${affiliatePageShell} [&_a]:text-[#2DD4BF] [&_a:hover]:underline`}>
      {children}
    </div>
  );
}
