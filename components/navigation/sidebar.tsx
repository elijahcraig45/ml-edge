"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatusCard } from "@/components/auth/auth-status-card";
import { navigationItems } from "@/components/navigation/navigation-items";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 flex-col rounded-[28px] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur lg:flex">
      <div className="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-indigo-300">
          The ML Edge
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          Engineer&apos;s Console
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Gemini operates as the course assistant: summarize, quiz, repeat.
        </p>
      </div>

      <nav className="mt-6 space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm",
                isActive
                  ? "border-indigo-400/50 bg-indigo-500/15 text-white"
                  : "border-white/8 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white",
              )}
            >
              <span>{item.label}</span>
              <span className="font-mono text-xs text-slate-400">{item.code}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/60 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
          Pipeline
        </p>
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>NewsAPI ingest</span>
            <span className="font-mono text-emerald-300">READY</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Gemini tutor</span>
            <span className="font-mono text-indigo-300">FLASH</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Cloud scheduler</span>
            <span className="font-mono text-amber-300">DAILY</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AuthStatusCard />
      </div>
    </aside>
  );
}
