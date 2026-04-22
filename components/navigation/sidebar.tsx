"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Brain,
  BookOpen,
  Newspaper,
  Target,
  Zap,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { AuthStatusCard } from "@/components/auth/auth-status-card";
import { navigationItems } from "@/components/navigation/navigation-items";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Brain,
  BookOpen,
  Newspaper,
  Target,
  Radio,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30">
          <Zap className="h-5 w-5 text-indigo-300" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">The ML Edge</p>
          <p className="text-[11px] text-slate-400">Engineer's console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-2 space-y-0.5">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href || pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = iconMap[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-indigo-500/15 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300",
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Daily context card — fills gap between nav and auth */}
      <div className="mt-auto mb-4 mx-1 rounded-xl border border-white/6 bg-slate-900/40 p-3.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">
            Daily signal
          </p>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          New quiz questions drop every morning. Keep your streak alive.
        </p>
        <Link
          href="/quiz"
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          Start today&apos;s quiz
          <span className="text-slate-500">→</span>
        </Link>
      </div>

      {/* Auth */}
      <div className="border-t border-white/8 pt-4">
        <AuthStatusCard />
      </div>
    </aside>
  );
}
