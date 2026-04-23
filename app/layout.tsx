import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileConsoleNav } from "@/components/navigation/mobile-console-nav";
import { Sidebar } from "@/components/navigation/sidebar";
import { Providers } from "@/components/providers";
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
  title: "The ML Edge",
  description:
    "An engineer's console for learning streaks, daily foundations drills, curriculum tracking, and AI news.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-7xl gap-0 lg:gap-8 px-0 lg:px-6 py-0 lg:py-6">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="px-4 pt-4 lg:hidden">
                  <MobileConsoleNav />
                </div>
                <main className="flex-1 overflow-hidden lg:rounded-2xl lg:border lg:border-white/8 lg:bg-slate-900/40 lg:shadow-xl lg:shadow-black/20">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
