import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurriculum, getTier } from "@/lib/curriculum/load";

export const dynamicParams = false;

export async function generateStaticParams() {
  const result = await getCurriculum();
  if (!result.ok) return [];
  return result.value.tiers.map((tier) => ({ tier: tier.id }));
}

export default async function TierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier: tierId } = await params;
  const result = await getTier(tierId);
  if (!result.ok) notFound();
  const tier = result.value;

  return (
    <div className="px-5 py-8 lg:px-8">
      <Link href="/learn" className="font-mono text-[11px] text-slate-500 hover:text-slate-300">
        ← All tiers
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50">
        {tier.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">{tier.audience}</p>

      <div className="mt-8 space-y-4">
        {tier.stages.map((stage) => (
          <Link
            key={stage.id}
            href={`/learn/${tier.id}/${stage.id}`}
            className="block rounded-2xl border border-white/10 bg-slate-900/40 p-5 hover:border-indigo-400/40"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">
              Stage {stage.order}
            </p>
            <h2 className="mt-2 text-base font-semibold text-slate-100">{stage.title}</h2>
            <p className="mt-2 text-sm italic text-slate-400">{stage.thesis}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
