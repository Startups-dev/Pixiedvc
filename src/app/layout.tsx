import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Inter,
  Geist_Mono,
} from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import SiteFooterClient from "@/components/layout/SiteFooterClient";
import AffiliateTracker from "@/components/affiliate/AffiliateTracker";
import VisitorTracker from "@/components/analytics/VisitorTracker";
import ReferralCapture from "@/components/referral/ReferralCapture";
import IntercomProvider from "@/components/chat/IntercomProvider";
import RecoveryRedirect from "@/components/auth/RecoveryRedirect";
import SupportWidget from "@/components/support/SupportWidget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hannadvc.com"),
  title: "HannaDVC • Disney Magic Meets Boutique Tech",
  description:
    "Plan enchanted Disney Vacation Club getaways with luxe UX, points intelligence, and concierge storytelling.",
  themeColor: "#0F2148",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "HannaDVC • Disney Magic Meets Boutique Tech",
    description:
      "Discover resorts, optimize points, and craft storybook itineraries with the HannaDVC planning studio.",
    type: "website",
    images: [
      {
        url: "/images/hannadvc-og.png",
        width: 1200,
        height: 630,
        alt: "HannaDVC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HannaDVC • Disney Magic Meets Boutique Tech",
    description:
      "Discover resorts, optimize points, and craft storybook itineraries with the HannaDVC planning studio.",
    images: ["/images/hannadvc-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} bg-surface text-ink antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <SiteFooterClient />
        </div>
        <Suspense fallback={null}>
          <AffiliateTracker />
        </Suspense>
        <Suspense fallback={null}>
          <VisitorTracker />
        </Suspense>
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <IntercomProvider />
        <Suspense fallback={null}>
          <RecoveryRedirect />
        </Suspense>
        <SupportWidget />
      </body>
    </html>
  );
}
