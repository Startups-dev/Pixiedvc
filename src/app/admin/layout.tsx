import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="pixie-internal-buttons">{children}</div>;
}
