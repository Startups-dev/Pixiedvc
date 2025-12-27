import type { Metadata } from "next";
import {
  Playfair_Display,
  DM_Sans,
  Geist_Mono,
  DM_Serif_Display,
} from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
  weight: "400",
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
        className={`${playfair.variable} ${dmSans.variable} ${geistMono.variable} ${dmSerif.variable} bg-surface text-ink antialiased`}
      >
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
