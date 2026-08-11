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

export const dynamic = "force-dynamic";

export default async function HaraPage() {
  const access = await getHaraAccessState();
  const previewMode = access.mode === "preview";
  console.info("[hara-page-props]", {
    accessEnabled: access.enabled,
    accessMode: access.mode,
    previewMode,
  });
  return <PixieClient enabled={access.enabled} previewMode={previewMode} />;
}
