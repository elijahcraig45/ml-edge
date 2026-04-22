"use client";

import { LogIn, LogOut, User } from "lucide-react";
import { useFirebase } from "@/context/firebase-context";

type AuthStatusCardProps = {
  compact?: boolean;
};

export function AuthStatusCard({ compact = false }: AuthStatusCardProps) {
  const { isConfigured, isLoading, signInWithGoogle, signOutUser, user } =
    useFirebase();

  const isSignedIn = Boolean(user);

  if (compact) {
    return (
      <button
        type="button"
        onClick={isSignedIn ? signOutUser : signInWithGoogle}
        disabled={isLoading || (!isConfigured && !isSignedIn)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSignedIn ? (
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <LogIn className="h-3.5 w-3.5 text-slate-400" />
        )}
        {isLoading ? "…" : isSignedIn ? "Sign out" : "Sign in"}
      </button>
    );
  }

  return (
    <div className="rounded-xl p-2">
      {isSignedIn ? (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-400/30">
            <User className="h-4 w-4 text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-100">{user?.email}</p>
            <p className="text-[11px] text-slate-500">Signed in</p>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            disabled={isLoading}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isLoading || !isConfigured}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LogIn className="h-4 w-4 text-slate-400" />
          <span>{isLoading ? "Checking session…" : "Sign in with Google"}</span>
        </button>
      )}
    </div>
  );
}
