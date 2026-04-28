"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CodingProblem, CodingTestCase } from "@/lib/types";

type TestResult = {
  label: string;
  passed: boolean;
  error?: string;
  hidden?: boolean;
};

type RunResult = {
  stdout: string;
  stderr: string;
  testResults: TestResult[];
  allPassed: boolean;
};

type PyodideInstance = {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { get: (key: string) => unknown };
};

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>;
    _pyodideInstance?: PyodideInstance;
    _pyodideLoading?: Promise<PyodideInstance>;
  }
}

async function getPyodide(): Promise<PyodideInstance> {
  if (window._pyodideInstance) return window._pyodideInstance;

  if (window._pyodideLoading) return window._pyodideLoading;

  window._pyodideLoading = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(script);
      });
    }
    const instance = await window.loadPyodide!({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
    });
    window._pyodideInstance = instance;
    return instance;
  })();

  return window._pyodideLoading;
}

async function runCode(
  pyodide: PyodideInstance,
  userCode: string,
  testCases: CodingTestCase[],
): Promise<RunResult> {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  // Capture stdout/stderr
  await pyodide.runPythonAsync(`
import sys
from io import StringIO
_stdout_capture = StringIO()
_stderr_capture = StringIO()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture
`);

  // Run user code in a fresh namespace
  const wrapperCode = `
_user_ns = {}
_exec_error = None
try:
    exec(${JSON.stringify(userCode)}, _user_ns)
except Exception as _e:
    _exec_error = str(_e)
`;

  await pyodide.runPythonAsync(wrapperCode);

  // Collect stdout
  await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
_captured_stdout = _stdout_capture.getvalue()
_captured_stderr = _stderr_capture.getvalue()
`);

  const capturedStdout = pyodide.globals.get("_captured_stdout") as string;
  const capturedStderr = pyodide.globals.get("_captured_stderr") as string;
  const execError = pyodide.globals.get("_exec_error") as string | null;

  if (capturedStdout) stdoutLines.push(capturedStdout.trimEnd());
  if (capturedStderr) stderrLines.push(capturedStderr.trimEnd());

  if (execError) {
    return {
      stdout: stdoutLines.join("\n"),
      stderr: execError,
      testResults: testCases.map((tc) => ({
        label: tc.label,
        passed: false,
        error: "Code failed to execute",
        hidden: tc.hidden,
      })),
      allPassed: false,
    };
  }

  // Run each test case
  const testResults: TestResult[] = [];
  for (const tc of testCases) {
    const testHarness = `
_test_passed = False
_test_error = None
try:
    ${tc.assertion.replace(/\n/g, "\n    ")}
    _test_passed = True
except AssertionError as _ae:
    _test_error = str(_ae) if str(_ae) else "Assertion failed"
except Exception as _te:
    _test_error = type(_te).__name__ + ": " + str(_te)
`;
    try {
      await pyodide.runPythonAsync(
        // merge user namespace into current scope first
        `globals().update(_user_ns)\n` + testHarness,
      );
      const passed = pyodide.globals.get("_test_passed") as boolean;
      const error = pyodide.globals.get("_test_error") as string | null;
      testResults.push({
        label: tc.label,
        passed: Boolean(passed),
        error: error ?? undefined,
        hidden: tc.hidden,
      });
    } catch (err) {
      testResults.push({
        label: tc.label,
        passed: false,
        error: err instanceof Error ? err.message : "Unknown error",
        hidden: tc.hidden,
      });
    }
  }

  return {
    stdout: stdoutLines.join("\n"),
    stderr: stderrLines.join("\n"),
    testResults,
    allPassed: testResults.every((r) => r.passed),
  };
}

type PythonCodeRunnerProps = {
  problem: CodingProblem;
  onAllPassed?: () => void;
};

export function PythonCodeRunner({ problem, onAllPassed }: PythonCodeRunnerProps) {
  const [code, setCode] = useState(problem.starterCode);
  const [pyodideState, setPyodideState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [runState, setRunState] = useState<"idle" | "running">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const pyodideRef = useRef<PyodideInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadPyodide = useCallback(async () => {
    if (pyodideRef.current) return;
    setPyodideState("loading");
    try {
      const py = await getPyodide();
      pyodideRef.current = py;
      setPyodideState("ready");
    } catch {
      setPyodideState("error");
    }
  }, []);

  // Load on first mount so it's ready when the user clicks Run
  useEffect(() => {
    void loadPyodide();
  }, [loadPyodide]);

  const handleRun = useCallback(async () => {
    if (!pyodideRef.current || runState === "running") return;
    setRunState("running");
    setResult(null);
    try {
      const res = await runCode(pyodideRef.current, code, problem.testCases);
      setResult(res);
      if (res.allPassed) onAllPassed?.();
    } finally {
      setRunState("idle");
    }
  }, [code, problem.testCases, runState, onAllPassed]);

  // Tab key inserts spaces instead of changing focus
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.substring(0, start) + "    " + code.substring(end);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
    }
  }

  const visibleTests = problem.testCases.filter((tc) => !tc.hidden);

  const difficultyColor: Record<string, string> = {
    easy: "border-sky-400/30 text-sky-300",
    medium: "border-amber-400/30 text-amber-300",
    hard: "border-rose-400/30 text-rose-300",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
        <span
          className={[
            "rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em]",
            difficultyColor[problem.difficulty] ?? "border-white/10 text-slate-400",
          ].join(" ")}
        >
          {problem.difficulty}
        </span>
        <span className="rounded-full border border-violet-400/30 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-300">
          Python
        </span>
        {result?.allPassed && (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            ✓ All tests passed
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {pyodideState === "loading" && (
            <span className="font-mono text-[11px] text-slate-500">Loading runtime…</span>
          )}
          {pyodideState === "error" && (
            <button
              type="button"
              onClick={() => void loadPyodide()}
              className="font-mono text-[11px] text-rose-400 hover:text-rose-300"
            >
              Retry load
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left: problem + editor */}
        <div className="flex flex-col">
          {/* Problem statement */}
          <div className="border-b border-white/10 px-5 py-4">
            <h4 className="text-sm font-semibold text-slate-100">{problem.title}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-300 whitespace-pre-wrap">
              {problem.prompt}
            </p>
            {visibleTests.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Examples
                </p>
                {visibleTests.slice(0, 2).map((tc) => (
                  <div
                    key={tc.label}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-400"
                  >
                    <span className="text-slate-500"># {tc.label}</span>
                    <br />
                    <span className="text-indigo-300">
                      {tc.assertion.split("\n")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code editor */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
              solution.py
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="h-full min-h-[280px] w-full resize-none bg-slate-950/80 px-4 pt-8 pb-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:ring-0"
              style={{ tabSize: 4 }}
            />
          </div>

          {/* Run controls */}
          <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={pyodideState !== "ready" || runState === "running"}
              className={[
                "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
                pyodideState === "ready"
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25"
                  : "border-white/10 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              {runState === "running"
                ? "Running…"
                : pyodideState === "loading"
                  ? "Loading Python…"
                  : "▶ Run"}
            </button>
            <button
              type="button"
              onClick={() => setCode(problem.starterCode)}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:border-slate-500"
            >
              Reset
            </button>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:border-amber-300/50"
              >
                {showHint ? "Hide hint" : "Hint"}
              </button>
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:border-slate-500"
              >
                {showSolution ? "Hide" : "Solution"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: output + tests */}
        <div className="flex flex-col">
          {/* Test results */}
          <div className="flex-1 px-5 py-4 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Test cases
            </p>
            {!result && (
              <div className="space-y-2">
                {problem.testCases.map((tc) =>
                  tc.hidden ? null : (
                    <div
                      key={tc.label}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                    >
                      <span className="text-xs text-slate-600">○</span>
                      <span className="text-xs text-slate-400">{tc.label}</span>
                    </div>
                  ),
                )}
                {problem.testCases.some((tc) => tc.hidden) && (
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-600">
                    + {problem.testCases.filter((tc) => tc.hidden).length} hidden test
                    {problem.testCases.filter((tc) => tc.hidden).length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
            {result && (
              <div className="space-y-2">
                {result.testResults.map((tr) => (
                  <div
                    key={tr.label}
                    className={[
                      "rounded-xl border px-3 py-2",
                      tr.hidden
                        ? tr.passed
                          ? "border-emerald-400/20 bg-emerald-500/5"
                          : "border-rose-400/20 bg-rose-500/5"
                        : tr.passed
                          ? "border-emerald-400/30 bg-emerald-500/10"
                          : "border-rose-400/30 bg-rose-500/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "text-xs",
                          tr.passed ? "text-emerald-400" : "text-rose-400",
                        ].join(" ")}
                      >
                        {tr.passed ? "✓" : "✗"}
                      </span>
                      <span
                        className={[
                          "text-xs",
                          tr.hidden ? "text-slate-500" : "text-slate-300",
                        ].join(" ")}
                      >
                        {tr.hidden ? `[hidden] ${tr.label}` : tr.label}
                      </span>
                    </div>
                    {!tr.passed && tr.error && (
                      <p className="mt-1 pl-4 font-mono text-[11px] text-rose-300">
                        {tr.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stdout */}
          <div className="border-t border-white/10 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Output
            </p>
            <pre className="mt-2 min-h-[60px] font-mono text-xs leading-5 text-slate-300 whitespace-pre-wrap">
              {result?.stdout || (result ? "(no output)" : "Run your code to see output")}
            </pre>
            {result?.stderr && (
              <pre className="mt-2 font-mono text-xs leading-5 text-rose-400 whitespace-pre-wrap">
                {result.stderr}
              </pre>
            )}
          </div>

          {/* Hint / Solution */}
          {showHint && (
            <div className="border-t border-amber-400/20 bg-amber-500/5 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/70">
                Hint
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{problem.hint}</p>
            </div>
          )}
          {showSolution && (
            <div className="border-t border-emerald-400/20 bg-emerald-500/5 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
                Solution
              </p>
              <pre className="mt-2 font-mono text-xs leading-6 text-slate-300 whitespace-pre-wrap overflow-x-auto">
                {problem.solution}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
