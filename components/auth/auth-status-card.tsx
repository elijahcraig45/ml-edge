"use client";

import { useFirebase } from "@/context/firebase-context";

type AuthStatusCardProps = {
  compact?: boolean;
};

export function AuthStatusCard({ compact = false }: AuthStatusCardProps) {
  const { isConfigured, isLoading, signInWithGoogle, signOutUser, user } =
    useFirebase();

  const isSignedIn = Boolean(user);
  const sessionLabel = isLoading
    ? "Checking session..."
    : isSignedIn
      ? user?.email
      : "Guest mode";
  const actionLabel = isLoading ? "Checking..." : isSignedIn ? "Sign out" : "Sign in";

  return (
    <div
      className={
        compact
          ? "rounded-3xl border border-white/10 bg-slate-900/70 p-3"
          : "rounded-3xl border border-white/10 bg-slate-900/70 p-4"
      }
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
        Auth Channel
      </p>
      <div
        className={
          compact
            ? "mt-3 flex flex-col gap-3"
            : "mt-3 flex flex-col items-start gap-3"
        }
      >
        <div>
          <p className="break-all text-sm font-semibold text-slate-100">
            {sessionLabel}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isConfigured
              ? "Firebase Auth online"
              : "Add NEXT_PUBLIC_FIREBASE_* variables to enable Google sign-in"}
          </p>
        </div>
        <button
          type="button"
          onClick={isSignedIn ? signOutUser : signInWithGoogle}
          disabled={isLoading || (!isConfigured && !isSignedIn)}
          className="w-full rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
