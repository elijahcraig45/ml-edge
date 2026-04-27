"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "@firebase/firestore";
import { Flame } from "lucide-react";
import { useFirebase } from "@/context/firebase-context";
import { firestore } from "@/lib/firebase/client";

export function StreakCard() {
  const { user, isLoading, isConfigured } = useFirebase();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setStreak(null);
      return;
    }

    getDoc(doc(firestore, "users", user.uid)).then((snap) => {
      const count = snap.data()?.streakCount;
      setStreak(typeof count === "number" ? count : 0);
    });
  }, [user]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4 animate-pulse">
        <div className="h-3 w-20 rounded bg-slate-700" />
        <div className="mt-3 h-8 w-10 rounded bg-slate-700" />
      </div>
    );
  }

  if (!isConfigured || !user) {
    return (
      <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-orange-500/15 p-2">
            <Flame className="h-4 w-4 text-orange-300" />
          </div>
        </div>
        <p className="mt-3 text-xs font-mono uppercase tracking-[0.15em] text-slate-500">
          Daily streak
        </p>
        <p className="mt-1.5 text-sm font-semibold text-slate-400">Sign in to track</p>
        <p className="mt-1 text-xs text-slate-600">Streaks persist across devices</p>
      </div>
    );
  }

  const isHot = (streak ?? 0) >= 3;

  return (
    <div
      className={[
        "rounded-xl border p-4 transition-colors",
        isHot
          ? "border-orange-500/30 bg-orange-950/20"
          : "border-white/8 bg-slate-900/50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div
          className={[
            "rounded-lg p-2",
            isHot ? "bg-orange-500/20" : "bg-slate-800",
          ].join(" ")}
        >
          <Flame
            className={["h-4 w-4", isHot ? "text-orange-300" : "text-slate-500"].join(" ")}
          />
        </div>
        {isHot && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">
            🔥 on a roll
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-mono uppercase tracking-[0.15em] text-slate-500">
        Daily streak
      </p>
      <p className="mt-1.5 text-3xl font-bold text-white">
        {streak ?? "—"}
        <span className="ml-1.5 text-sm font-normal text-slate-500">
          day{streak !== 1 ? "s" : ""}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-600">
        {(streak ?? 0) === 0
          ? "Complete today's quiz to start your streak"
          : "Keep going — complete today's quiz to extend it"}
      </p>
    </div>
  );
}
