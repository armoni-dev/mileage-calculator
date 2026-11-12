import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tricoca",
  description: "tricoca",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = "GTM-P5D8X7QJ";

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <GoogleTagManager gtmId={gtmId} />
        {children}
      </body>
    </html>
  );
}