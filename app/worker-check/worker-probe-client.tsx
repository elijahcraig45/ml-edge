"use client";

import { useEffect, useState } from "react";

export function WorkerProbe() {
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    let worker: Worker | undefined;
    try {
      worker = new Worker(new URL("./worker-probe.ts", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      // Report asynchronously; setState in the effect body cascades renders.
      const message = error instanceof Error ? error.message : "unknown";
      queueMicrotask(() => setStatus(`error:${message}`));
      return;
    }
    worker.onmessage = (event: MessageEvent<number>) => setStatus(`ok:${event.data}`);
    worker.onerror = () => setStatus("error:worker-onerror");
    worker.postMessage(2);
    const created = worker;
    return () => created.terminate();
  }, []);

  return <span data-testid="worker-status">{status}</span>;
}
