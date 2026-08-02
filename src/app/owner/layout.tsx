import type { ReactNode } from "react";

import OwnerShell from "@/components/owner/shell/OwnerShell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
