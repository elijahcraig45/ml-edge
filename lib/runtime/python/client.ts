"use client";

import { pyodideIndexURL } from "../sources";
import type {
  PythonRunRequest,
  RunOutcome,
  WorkerInbound,
  WorkerOutbound,
} from "../protocol";

/**
 * Owns the Pyodide worker lifecycle.
 *
 * The timeout is enforced here, not in the worker: wasm-hosted CPython cannot
 * be interrupted mid-loop, so the only reliable kill is terminating the worker.
 * After a kill we immediately boot a replacement in the background, so the next
 * Run is not stuck behind a cold start.
 */

export type PythonRunnerStatus = "idle" | "booting" | "ready" | "error";

type Pending = {
  resolve: (outcome: RunOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
  requestId: string;
};

export class PythonRunner {
  private worker: Worker | null = null;
  private booting: Promise<void> | null = null;
  private pending: Pending | null = null;
  private packages: string[];
  private disposed = false;

  constructor(packages: string[] = []) {
    this.packages = packages;
  }

  /** Idempotent. Safe to call on viewport entry. */
  async boot(): Promise<void> {
    if (this.disposed) throw new Error("PythonRunner has been disposed");
    if (this.worker && !this.booting) return;
    if (this.booting) return this.booting;

    this.booting = new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker = worker;

      worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
        const message = event.data;
        if (message.type === "ready") {
          resolve();
          return;
        }
        if (message.type === "init-error") {
          reject(new Error(message.message));
          return;
        }
        this.settle(message.outcome);
      };
      worker.onerror = () => reject(new Error("Python worker failed to start"));

      const init: WorkerInbound = {
        type: "init",
        indexURL: pyodideIndexURL(),
        packages: this.packages,
      };
      worker.postMessage(init);
    }).finally(() => {
      this.booting = null;
    });

    return this.booting;
  }

  async run(request: PythonRunRequest, timeoutMs: number): Promise<RunOutcome> {
    await this.boot();
    const worker = this.worker;
    if (!worker) {
      return this.engineError(request.id, "Python runtime unavailable");
    }
    if (this.pending) {
      return this.engineError(request.id, "A run is already in progress");
    }

    return new Promise<RunOutcome>((resolve) => {
      const timer = setTimeout(() => {
        // The only way to stop a runaway loop. `hardReset` also clears the
        // pending slot, so the replacement worker starts genuinely idle —
        // otherwise the next Run is rejected as "already in progress".
        this.hardReset();
        resolve({
          id: request.id,
          status: "timeout",
          stdout: "",
          stderr: "",
          error: {
            type: "Timeout",
            message: `Your code ran longer than ${Math.round(timeoutMs / 1000)}s and was stopped. This usually means a loop never exits.`,
            traceback: "",
          },
          tests: [],
          score: { earned: 0, possible: 0 },
          durationMs: timeoutMs,
        });
        void this.boot().catch(() => undefined);
      }, timeoutMs);

      this.pending = { resolve, timer, requestId: request.id };
      const message: WorkerInbound = { type: "run", request };
      worker.postMessage(message);
    });
  }

  /** Manual Stop button. Same mechanism as the timeout. */
  stop(): void {
    const pending = this.pending;
    if (!pending) return;
    // Capture the resolver before resetting: hardReset clears the pending slot.
    this.hardReset();
    void this.boot().catch(() => undefined);
    pending.resolve({
      id: pending.requestId,
      status: "timeout",
      stdout: "",
      stderr: "",
      error: { type: "Stopped", message: "Run stopped.", traceback: "" },
      tests: [],
      score: { earned: 0, possible: 0 },
      durationMs: 0,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.hardReset();
  }

  private hardReset(): void {
    this.worker?.terminate();
    this.worker = null;
    this.booting = null;
    if (this.pending) clearTimeout(this.pending.timer);
    // Must be cleared, not just timed out: `run()` refuses to start while a
    // pending slot is occupied.
    this.pending = null;
  }

  private settle(outcome: RunOutcome): void {
    if (!this.pending || this.pending.requestId !== outcome.id) return;
    clearTimeout(this.pending.timer);
    const { resolve } = this.pending;
    this.pending = null;
    resolve(outcome);
  }

  private engineError(id: string, message: string): RunOutcome {
    return {
      id,
      status: "engine-error",
      stdout: "",
      stderr: message,
      tests: [],
      score: { earned: 0, possible: 0 },
      durationMs: 0,
    };
  }
}

/** Rejects a submission before execution, e.g. `sorted(` inside a sort lab. */
export function checkForbidden(
  code: string,
  forbid: string[] | undefined,
): string | null {
  if (!forbid || forbid.length === 0) return null;
  // Ignore comments so a `# don't use sorted()` note doesn't trip the guard.
  const stripped = code.replace(/#.*$/gm, "");
  for (const needle of forbid) {
    if (stripped.includes(needle)) {
      return `This exercise doesn't allow \`${needle}\` — the point is to implement it yourself.`;
    }
  }
  return null;
}
