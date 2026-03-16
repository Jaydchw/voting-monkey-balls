import type { Metadata } from "next";
import { Bungee, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { GlobalAudioSettings } from "@/components/global-audio-settings";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const bungee = Bungee({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TTG: Voting Monkey Balls",
  description: "An interactive auto-battler driven by spectator votes and bets.",
  icons: {
    icon: "/monkey reactions/emoji/monkey-emojis-1.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        bungee.variable,
        jetbrainsMono.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="antialiased">
        {children}
        <GlobalAudioSettings />
      </body>
    </html>
  );
}