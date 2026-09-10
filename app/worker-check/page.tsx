import { WorkerProbe } from "./worker-probe-client";

export const dynamic = "force-dynamic";

export default function WorkerCheckPage() {
  return (
    <main className="p-8">
      <h1 className="text-lg font-semibold">Worker support probe</h1>
      <p className="mt-2 text-sm text-slate-400">
        Diagnostic route for the module-worker bundling test.
      </p>
      <p className="mt-4 font-mono text-sm">
        <WorkerProbe />
      </p>
    </main>
  );
}
