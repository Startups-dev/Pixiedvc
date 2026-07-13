import type { Metadata } from "next";

import PixieClient from "@/app/pixie/PixieClient";

export const metadata: Metadata = {
  title: "Pixie AI Disney Vacation Planner | PixieDVC",
  description: "Plan a Walt Disney World vacation with Pixie, the AI planning assistant inside PixieDVC.",
  robots: {
    index: false,
    follow: false,
  },
};

function pixieEnabled() {
  if (process.env.PIXIE_PUBLIC_ENABLED === "true") return true;
  if (process.env.PIXIE_PUBLIC_ENABLED === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export default function PixiePage() {
  const enabled = pixieEnabled();
  return <PixieClient enabled={enabled} />;
}

