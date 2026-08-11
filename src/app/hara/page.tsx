import type { Metadata } from "next";

import PixieClient from "@/app/pixie/PixieClient";
import { getHaraAccessState } from "@/lib/pixie/hara-access";

export const metadata: Metadata = {
  title: "Ask Hara | HannaDVC",
  description: "Plan a Walt Disney World vacation with Hara inside HannaDVC.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HaraPage() {
  const access = await getHaraAccessState();
  return <PixieClient enabled={access.enabled} previewMode={access.mode === "preview"} />;
}
