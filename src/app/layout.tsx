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
  title: "PixieDVC • Disney Magic Meets Boutique Tech",
  description:
    "Plan enchanted Disney Vacation Club getaways with luxe UX, points intelligence, and concierge storytelling.",
  openGraph: {
    title: "PixieDVC • Disney Magic Meets Boutique Tech",
    description:
      "Discover resorts, optimize points, and craft storybook itineraries with the PixieDVC planning studio.",
    type: "website",
  },
};

export const viewport = {
  themeColor: '#2E8FFF',
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
