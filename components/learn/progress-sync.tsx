"use client";

import { useEffect, useState } from "react";
import { useFirebase } from "@/context/firebase-context";
import { syncProgress } from "@/lib/progress/cloud-sync";

/**
 * Syncs progress when a signed-in learner loads the curriculum.
 *
 * Renders a one-line confirmation only when something was actually restored,
 * so the common case is silent.
 */
export function ProgressSync() {
  const { user } = useFirebase();
  const [restored, setRestored] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void syncProgress(user)
      .then((count) => {
        if (!cancelled && count > 0) setRestored(count);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!restored) return null;

  return (
    <p className="border-b border-emerald-400/20 bg-emerald-500/5 px-5 py-2 text-xs text-emerald-200 lg:px-8">
      Restored progress for {restored} lesson{restored === 1 ? "" : "s"} from your account.
    </p>
  );
}
