import type { Metadata } from "next";

import PixieClient from "@/app/pixie/PixieClient";

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
  return <PixieClient />;
}
