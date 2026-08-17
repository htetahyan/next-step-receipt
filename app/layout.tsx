import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import OfflineBanner from "@/components/ui/OfflineBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NextStep Travel & Tourism",
  description: "NextStep Travel & Tourism",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F5F4EF] text-[#222222]" suppressHydrationWarning>
        <OfflineBanner />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
