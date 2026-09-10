"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type {
  CompiledDataset,
  CompiledExercise,
  CompiledLesson,
  LessonBlock,
} from "@/lib/curriculum/artifact";
import {
  DEFAULT_LEARNER_PATH,
  LEARNER_PATHS,
  tracksForPath,
  type LearnerPath,
} from "@/lib/curriculum/types";
import { useLessonProgress } from "@/lib/progress/use-lesson-progress";
import { emptyExerciseProgress } from "@/lib/progress/curriculum-progress";
import { Callout } from "./callout";
import { CheckpointBlock } from "./checkpoint-block";
import { DatasetBlock } from "./dataset-block";
import { Figure } from "./figure";
import { LessonProgressRail } from "./lesson-progress-rail";
import { LessonToc } from "./lesson-toc";
import { Prose } from "./prose";
import { PythonExercise } from "./python-exercise";
import { QuizBlock } from "./quiz-block";
import { RunnableBlock } from "./runnable-block";
import { SqlExercise } from "./sql-exercise";
import { TrackSwitcher } from "./track-switcher";

const PATH_STORAGE_KEY = "mle.learn.v2.path";

export type LessonLink = { href: string; title: string };

export function LessonView({
  lesson,
  datasets,
  previous,
  next,
}: {
  lesson: CompiledLesson;
  datasets: Record<string, CompiledDataset>;
  previous?: LessonLink;
  next?: LessonLink;
}) {
  const [path, setPath] = useState<LearnerPath>(readStoredPath);
  const {
    progress,
    setBlockComplete,
    setCheckpointResponse,
    setQuizAnswers,
    updateExercise,
    markLessonComplete,
  } = useLessonProgress(lesson.id, lesson.contentHash);

  const activeTracks = useMemo(() => tracksForPath(path), [path]);

  const visibleBlocks = useMemo(
    () =>
      lesson.blocks.filter(
        (block) => !block.tracks || block.tracks.some((t) => activeTracks.includes(t)),
      ),
    [lesson.blocks, activeTracks],
  );

  /** Only blocks a learner can actually act on count toward completion. */
  const requiredBlockIds = useMemo(
    () =>
      visibleBlocks
        .filter((b) => !b.optional && isActionable(b))
        .map((b) => b.id),
    [visibleBlocks],
  );

  const done = requiredBlockIds.filter((id) => progress.completedBlocks[id]).length;

  // Headings come from the visible blocks, so the rail always agrees with the
  // page — switching to the proof pass adds its sections here too.
  const headings = useMemo(
    () =>
      visibleBlocks.flatMap((block) =>
        block.kind === "prose" ? block.headings : [],
      ),
    [visibleBlocks],
  );

  const choosePath = useCallback((next: LearnerPath) => {
    setPath(next);
    try {
      window.localStorage.setItem(PATH_STORAGE_KEY, next);
    } catch {
      // Preference only; a failure here changes nothing that matters.
    }
  }, []);

  return (
    <article className="flex flex-col">
      <LessonProgressRail
        done={done}
        total={requiredBlockIds.length}
        completed={Boolean(progress.completedAt)}
        onComplete={markLessonComplete}
      />

      <header className="border-b border-white/10 px-5 py-6 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          {lesson.id} · {lesson.estimatedMinutes} min
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 lg:text-3xl">
          {lesson.title}
        </h1>

        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            By the end you can
          </p>
          <ul className="mt-2 space-y-1.5">
            {lesson.objectivesHtml.map((objective, index) => (
              <li key={index} className="flex gap-2.5 text-sm text-slate-300">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                <span dangerouslySetInnerHTML={{ __html: objective }} />
              </li>
            ))}
          </ul>
        </div>

        {lesson.availableTracks.length > 1 ? (
          <div className="mt-5">
            <TrackSwitcher
              available={lesson.availableTracks}
              active={path}
              onChange={choosePath}
            />
          </div>
        ) : null}
      </header>

      <div className="flex gap-10 px-5 py-6 lg:px-8">
        <LessonToc headings={headings} />
        <div className="min-w-0 flex-1 space-y-6">
        {visibleBlocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            exercises={lesson.exercises}
            datasets={datasets}
            progress={progress}
            onBlockComplete={setBlockComplete}
            onCheckpoint={setCheckpointResponse}
            onQuiz={setQuizAnswers}
            onExercise={updateExercise}
          />
        ))}

        <section className="rounded-2xl border border-rose-400/20 bg-rose-500/5 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300">
            Where people go wrong
          </p>
          <ul className="mt-3 space-y-3">
            {lesson.misconceptionsHtml.map((html, index) => (
              <li key={index} className="flex gap-2.5">
                <span className="mt-1 font-mono text-xs text-rose-400">✗</span>
                <Prose html={html} className="text-sm" />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Before you move on
          </p>
          <ul className="mt-3 space-y-2">
            {lesson.masteryChecklistHtml.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 text-slate-600">☐</span>
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </section>
        </div>
      </div>

      <nav className="flex flex-wrap gap-3 border-t border-white/10 px-5 py-5 lg:px-8">
        {previous ? (
          <Link
            href={previous.href}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:border-slate-500"
          >
            ← {previous.title}
          </Link>
        ) : null}
        {next ? (
          <Link
            href={next.href}
            className="ml-auto rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-100 hover:border-indigo-300"
          >
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}

type ProgressShape = ReturnType<typeof useLessonProgress>["progress"];

type UpdateExercise = ReturnType<typeof useLessonProgress>["updateExercise"];

function BlockRenderer({
  block,
  exercises,
  datasets,
  progress,
  onBlockComplete,
  onCheckpoint,
  onQuiz,
  onExercise,
}: {
  block: LessonBlock;
  exercises: Record<string, CompiledExercise>;
  datasets: Record<string, CompiledDataset>;
  progress: ProgressShape;
  onBlockComplete: (id: string, complete: boolean) => void;
  onCheckpoint: (id: string, text: string) => void;
  onQuiz: (id: string, answers: number[], submitted: boolean) => void;
  onExercise: UpdateExercise;
}) {
  switch (block.kind) {
    case "prose":
      return <Prose html={block.html} />;
    case "callout":
      return <Callout block={block} />;
    case "figure":
      return <Figure block={block} />;
    case "code":
      return <Prose html={block.html} />;
    case "runnable":
      return (
        <RunnableBlock
          block={block}
          dataset={
            block.runtime.engine === "duckdb"
              ? datasets[block.runtime.datasetId]
              : undefined
          }
        />
      );
    case "dataset": {
      const dataset = datasets[block.datasetId];
      return dataset ? <DatasetBlock dataset={dataset} tables={block.tables} /> : null;
    }
    case "checkpoint":
      return (
        <CheckpointBlock
          block={block}
          value={progress.checkpointResponses[block.id] ?? ""}
          onChange={(text) => {
            onCheckpoint(block.id, text);
            onBlockComplete(block.id, text.trim().length > 0);
          }}
        />
      );
    case "quiz":
      return (
        <QuizBlock
          block={block}
          answers={progress.quizAnswers[block.id] ?? []}
          submitted={Boolean(progress.quizSubmitted[block.id])}
          onChange={(answers, submitted) => {
            onQuiz(block.id, answers, submitted);
            if (submitted) {
              const correct = answers.filter(
                (a, i) => a === block.questions[i]?.answerIndex,
              ).length;
              onBlockComplete(block.id, correct >= block.passing);
            }
          }}
        />
      );
    case "exercise":
      return (
        <ExerciseSlot
          block={block}
          exercises={exercises}
          datasets={datasets}
          progress={progress}
          onBlockComplete={onBlockComplete}
          onExercise={onExercise}
        />
      );
  }
}

function ExerciseSlot({
  block,
  exercises,
  datasets,
  progress,
  onBlockComplete,
  onExercise,
}: {
  block: Extract<LessonBlock, { kind: "exercise" }>;
  exercises: Record<string, CompiledExercise>;
  datasets: Record<string, CompiledDataset>;
  progress: ProgressShape;
  onBlockComplete: (id: string, complete: boolean) => void;
  onExercise: UpdateExercise;
}) {
  const exercise = exercises[block.exerciseId];
  if (!exercise) return null;

  const exerciseProgress = progress.exercises[exercise.id] ?? emptyExerciseProgress();
  const handle = (mutate: Parameters<typeof onExercise>[1]) => {
    onExercise(exercise.id, (current) => {
      const next = mutate(current);
      if (next.solved) onBlockComplete(block.id, true);
      return next;
    });
  };

  if (exercise.kind === "python") {
    return (
      <PythonExercise
        exercise={exercise}
        progress={exerciseProgress}
        onProgress={handle}
      />
    );
  }
  const dataset = datasets[exercise.datasetId];
  if (!dataset) return null;
  return (
    <SqlExercise
      exercise={exercise}
      dataset={dataset}
      progress={exerciseProgress}
      onProgress={handle}
    />
  );
}

function isActionable(block: LessonBlock): boolean {
  return (
    block.kind === "quiz" || block.kind === "checkpoint" || block.kind === "exercise"
  );
}

function readStoredPath(): LearnerPath {
  if (typeof window === "undefined") return DEFAULT_LEARNER_PATH;
  try {
    const stored = window.localStorage.getItem(PATH_STORAGE_KEY);
    if ((LEARNER_PATHS as readonly string[]).includes(stored ?? "")) {
      return stored as LearnerPath;
    }
  } catch {
    // Storage unavailable; the default is a fine answer.
  }
  return DEFAULT_LEARNER_PATH;
}
