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
  Headphones,
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
  Headphones,
};

export function MobileConsoleNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-1 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-400/30">
            <Zap className="h-4 w-4 text-indigo-300" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold text-white">The ML Edge</span>
        </div>
        <AuthStatusCard compact />
      </div>

      {/* Scrollable nav pills */}
      <nav className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">
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
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-500/20 text-white ring-1 ring-indigo-400/30"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-100",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-indigo-300" : "text-slate-500",
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
