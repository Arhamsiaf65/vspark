import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Captionly · Say it well. Post it on time.",
  description: "AI captions with Gemini, scheduled and saved to your Google Drive, with email reminders.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
