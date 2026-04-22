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
    "An engineer's console for learning streaks, daily ML quizzes, curriculum tracking, and AI news.",
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
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_60%,_#111827_100%)] text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
              <Sidebar />
              <div className="flex-1 space-y-4 lg:space-y-0">
                <MobileConsoleNav />
                <main className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-2xl shadow-indigo-950/30 backdrop-blur">
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
