/// <reference lib="webworker" />
/**
 * Pyodide worker.
 *
 * Runs off the main thread specifically so a learner's `while True:` can be
 * killed. There is no cooperative way to interrupt CPython running in wasm
 * mid-loop, so the only reliable stop is `worker.terminate()` from the client —
 * which is why execution must not share a thread with the UI.
 */
import harnessSource from "./harness.generated";
import type {
  PythonRunRequest,
  RunOutcome,
  TestOutcome,
  WorkerInbound,
  WorkerOutbound,
} from "../protocol";

type PyodideAPI = {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<void>;
  globals: { get: (key: string) => unknown };
};

declare const self: DedicatedWorkerGlobalScope & {
  loadPyodide?: (config: { indexURL: string }) => Promise<PyodideAPI>;
  importScripts: (...urls: string[]) => void;
};

let pyodide: PyodideAPI | null = null;
let runPython: ((payload: string) => Promise<string>) | null = null;

function post(message: WorkerOutbound) {
  self.postMessage(message);
}

async function init(indexURL: string, packages: string[]) {
  if (!self.loadPyodide) {
    self.importScripts(`${indexURL}pyodide.js`);
  }
  pyodide = await self.loadPyodide!({ indexURL });
  if (packages.length > 0) {
    await pyodide.loadPackage(packages);
  }
  await pyodide.runPythonAsync(harnessSource);
  const fn = pyodide.globals.get("run") as unknown;
  runPython = async (payload: string) => {
    const callable = fn as (arg: string) => string | Promise<string>;
    return await callable(payload);
  };
}

type HarnessResult = {
  status: "ok" | "exception";
  stdout: string;
  stderr: string;
  error: { type: string; message: string; line: number | null; traceback: string } | null;
  tests: Array<{
    id: string;
    label: string;
    hidden: boolean;
    status: "passed" | "failed" | "errored";
    message: string | null;
    durationMs: number;
  }>;
};

async function run(request: PythonRunRequest): Promise<RunOutcome> {
  const started = performance.now();
  if (!pyodide || !runPython) {
    return {
      id: request.id,
      status: "engine-error",
      stdout: "",
      stderr: "Python runtime is not ready.",
      tests: [],
      score: { earned: 0, possible: 0 },
      durationMs: 0,
    };
  }

  if (request.packages.length > 0) {
    await pyodide.loadPackage(request.packages);
  }

  const raw = await runPython(
    JSON.stringify({
      code: request.code,
      tests: request.tests,
      deterministic: request.deterministic,
      complexityBudget: request.complexityBudget ?? null,
    }),
  );
  const parsed = JSON.parse(raw) as HarnessResult;

  const tests: TestOutcome[] = parsed.tests.map((t) => ({
    id: t.id,
    label: t.label,
    hidden: t.hidden,
    status: t.status,
    message: t.message ?? undefined,
    durationMs: t.durationMs,
  }));

  const pointsById = new Map(request.tests.map((t) => [t.id, t.points]));
  const possible = request.tests.reduce((sum, t) => sum + t.points, 0);
  const earned = tests
    .filter((t) => t.status === "passed")
    .reduce((sum, t) => sum + (pointsById.get(t.id) ?? 0), 0);

  return {
    id: request.id,
    status: parsed.status,
    stdout: parsed.stdout,
    stderr: parsed.stderr,
    error: parsed.error
      ? {
          type: parsed.error.type,
          message: parsed.error.message,
          line: parsed.error.line ?? undefined,
          traceback: parsed.error.traceback,
        }
      : undefined,
    tests,
    score: { earned, possible },
    durationMs: performance.now() - started,
  };
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      await init(message.indexURL, message.packages);
      post({ type: "ready" });
      return;
    }
    post({ type: "result", outcome: await run(message.request) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (message.type === "init") {
      post({ type: "init-error", message: detail });
      return;
    }
    post({
      type: "result",
      outcome: {
        id: message.request.id,
        status: "engine-error",
        stdout: "",
        stderr: detail,
        tests: [],
        score: { earned: 0, possible: 0 },
        durationMs: 0,
      },
    });
  }
};

export {};
