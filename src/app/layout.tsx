import type { Metadata } from "next";
import { Comfortaa, M_PLUS_Rounded_1c } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-m-plus-rounded-1c",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Tricoca - 旅費計算アプリ",
  description: "Trip cost calculator - 車での移動費やガソリン代を簡単・スマートに計算できる旅費計算アプリです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = "GTM-P5D8X7QJ";

  return (
    <html lang="ja" className={cn("font-sans", mPlusRounded.variable)}>
      <body
        className={`${comfortaa.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <GoogleTagManager gtmId={gtmId} />
        {children}
      </body>
    </html>
  );
}
