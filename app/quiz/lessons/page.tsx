import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { getMiniLessonHistory } from "@/lib/content";
import type { DailyMiniLesson } from "@/lib/types";

export const dynamic = "force-dynamic";

const THEME_ORDER = [
  "Large Language Models",
  "Reinforcement Learning",
  "Computer Vision & Generative AI",
  "MLOps & Infrastructure",
  "Data & Training",
  "AI Strategy & Industry",
];

function groupByTheme(lessons: DailyMiniLesson[]): Map<string, DailyMiniLesson[]> {
  const map = new Map<string, DailyMiniLesson[]>();

  for (const lesson of lessons) {
    const theme = lesson.curriculumTheme ?? "AI Strategy & Industry";

    if (!map.has(theme)) map.set(theme, []);
    map.get(theme)!.push(lesson);
  }

  const sorted = new Map<string, DailyMiniLesson[]>();

  for (const t of THEME_ORDER) {
    if (map.has(t)) sorted.set(t, map.get(t)!);
  }
  for (const [t, v] of map) {
    if (!sorted.has(t)) sorted.set(t, v);
  }

  return sorted;
}

export default async function MiniLessonsPage() {
  const lessons = await getMiniLessonHistory(60);
  const grouped = groupByTheme(lessons);

  return (
    <div className="console-grid min-h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Panel eyebrow="Lesson library" title="Learn by topic">
          <p className="text-sm leading-7 text-slate-300">
            Every day&apos;s pre-quiz mini-lesson, organised by curriculum theme. Each
            includes a podcast episode you can listen to on the go.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} across{" "}
            {grouped.size} theme{grouped.size !== 1 ? "s" : ""}
          </p>
        </Panel>

        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
            <p className="text-sm text-slate-400">
              No lessons yet — check back after the next daily update runs.
            </p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([theme, themeLessons]) => (
            <section key={theme}>
              <h2 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <span className="h-px flex-1 bg-slate-700/60" />
                {theme}
                <span className="h-px flex-1 bg-slate-700/60" />
              </h2>
              <ul className="space-y-2">
                {themeLessons.map((lesson) => (
                  <li key={lesson.date}>
                    <Link
                      href={`/quiz/lessons/${lesson.date}`}
                      className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 transition hover:border-indigo-500/40 hover:bg-slate-800/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-xs font-medium text-slate-500">
                          {lesson.date}
                          {lesson.audioUrl && (
                            <span className="ml-2 text-indigo-400">🎧</span>
                          )}
                        </p>
                        <p className="truncate text-sm font-medium text-white">
                          {lesson.headline}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {lesson.topic}
                        </p>
                      </div>
                      <span className="shrink-0 text-slate-600">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
