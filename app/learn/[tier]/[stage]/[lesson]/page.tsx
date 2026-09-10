import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonView } from "@/components/learn/lesson-view";
import { getAllLessonParams, getCurriculum, getLesson } from "@/lib/curriculum/load";

/** Every published lesson is prerendered; unpublished slugs 404. */
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllLessonParams();
}

type Params = Promise<{ tier: string; stage: string; lesson: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tier, stage, lesson } = await params;
  const result = await getLesson(tier, stage, lesson);
  if (!result.ok) return { title: "Lesson not found" };
  return {
    title: result.value.lesson.title,
    description: result.value.lesson.objectives[0],
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { tier, stage, lesson } = await params;
  const [result, curriculum] = await Promise.all([
    getLesson(tier, stage, lesson),
    getCurriculum(),
  ]);
  if (!result.ok || !curriculum.ok) notFound();

  const { lesson: compiled, previous, next } = result.value;

  return (
    <LessonView
      lesson={compiled}
      datasets={curriculum.value.datasets}
      previous={
        previous
          ? {
              href: `/learn/${previous.tierId}/${previous.stageId}/${previous.slug}`,
              title: previous.title,
            }
          : undefined
      }
      next={
        next
          ? {
              href: `/learn/${next.tierId}/${next.stageId}/${next.slug}`,
              title: next.title,
            }
          : undefined
      }
    />
  );
}
