import type { Metadata } from "next";
import { CurriculumSearch } from "@/components/learn/curriculum-search";
import { ProgressSync } from "@/components/learn/progress-sync";

export const metadata: Metadata = {
  title: {
    default: "Data Structures & Algorithms",
    template: "%s · DS&A · The ML Edge",
  },
  description:
    "A ladder from first principles to graduate-level data structures and algorithms, taught in Python and SQL, with every exercise runnable in the browser.",
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <ProgressSync />
      <div className="flex justify-end border-b border-white/10 px-5 py-3 lg:px-8">
        {/* The index is fetched on first focus, not embedded in the payload. */}
        <CurriculumSearch />
      </div>
      {children}
    </div>
  );
}
