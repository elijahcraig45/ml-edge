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

const siteUrl = "https://mle-edge.dev";

export const metadata: Metadata = {
  title: {
    default: "The ML Edge — DS&A in Python and SQL",
    template: "%s · The ML Edge",
  },
  description:
    "A free data structures and algorithms curriculum from first principles to graduate level, taught in Python and SQL, with every exercise runnable and auto-graded in your browser.",
  applicationName: "The ML Edge",
  metadataBase: new URL(siteUrl),
  keywords: [
    "data structures and algorithms",
    "dsa course",
    "python algorithms",
    "sql window functions",
    "technical interview prep",
    "leetcode practice",
    "query optimization",
    "interactive curriculum",
  ],
  openGraph: {
    title: "The ML Edge — DS&A in Python and SQL",
    description:
      "Every data structure has a relational twin. Learn both together, from first principles to graduate level, with runnable auto-graded exercises.",
    url: siteUrl,
    siteName: "The ML Edge",
    images: [
      {
        url: "/og-dashboard.png",
        width: 1440,
        height: 1100,
        alt: "The ML Edge dashboard preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The ML Edge — DS&A in Python and SQL",
    description:
      "Every data structure has a relational twin. Learn both together, from first principles to graduate level, with runnable auto-graded exercises.",
    images: ["/og-dashboard.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-500 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Providers>
          <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-7xl gap-0 lg:gap-8 px-0 lg:px-6 py-0 lg:py-6">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="px-4 pt-4 lg:hidden">
                  <MobileConsoleNav />
                </div>
                <main id="main" className="flex-1 overflow-hidden lg:rounded-2xl lg:border lg:border-white/8 lg:bg-slate-900/40 lg:shadow-xl lg:shadow-black/20">
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
