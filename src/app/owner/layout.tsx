import type { ReactNode } from "react";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <div className="pixie-internal-buttons">{children}</div>;
}
