"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatusCard } from "@/components/auth/auth-status-card";
import { navigationItems } from "@/components/navigation/navigation-items";
import { cn } from "@/lib/utils";

export function MobileConsoleNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 lg:hidden">
      <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-indigo-300">
            The ML Edge
          </p>
          <h1 className="mt-3 text-xl font-semibold text-white">
            Engineer&apos;s Console
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Daily briefing, quizzes, and curriculum in one console.
          </p>
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-2">
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

        <div className="mt-4">
          <AuthStatusCard compact />
        </div>
      </div>
    </div>
  );
}
