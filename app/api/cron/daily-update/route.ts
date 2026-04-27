import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDateKey } from "@/lib/date";
import { getRequiredServerEnv } from "@/lib/env";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { generateDailyDeepDive, generateDailyMiniLesson } from "@/lib/geminiService";
import { fetchTopAiHeadlines } from "@/lib/newsService";
import { generateLessonMedia, generateDeepDiveMedia, deriveTheme } from "@/lib/ttsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getProvidedSecret(
  authorizationHeader: string | null,
  cronHeader: string | null,
) {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  return cronHeader;
}

export async function POST() {
  const configuredSecret = getRequiredServerEnv("CRON_SECRET");
  const headerStore = await headers();
  const providedSecret = getProvidedSecret(
    headerStore.get("authorization"),
    headerStore.get("x-cron-secret"),
  );

  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();

  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured." },
      { status: 500 },
    );
  }

  const articles = await fetchTopAiHeadlines();
  const generated = await generateDailyDeepDive(articles);
  const date = getDateKey();
  const document = {
    date,
    headline: generated.headline,
    technicalSummary: generated.technicalSummary,
    deepDive: generated.deepDive,
    status: "generated" as const,
    sourceArticles: articles,
  };

  await db.collection("daily_content").doc(date).set(document, { merge: true });

  // Generate deep-dive podcast audio + video (non-fatal)
  try {
    const deepDiveContent = { ...document, audioUrl: null, videoUrl: null };
    const { audioUrl: ddAudioUrl, videoUrl: ddVideoUrl } = await generateDeepDiveMedia(deepDiveContent);
    await db.collection("daily_content").doc(date).update({
      audioUrl: ddAudioUrl ?? null,
      videoUrl: ddVideoUrl ?? null,
    });
  } catch (deepDiveMediaError) {
    console.error("Deep-dive media generation failed (non-fatal):", deepDiveMediaError);
  }

  // Generate and save today's mini-lesson — topic must match today's quiz topic
  // so the lesson and quiz are always about the same ML/AI concept.
  const { buildDailyQuizFromQuestionBank } = await import("@/lib/authored-question-bank");
  const { buildPublishedQuestionBankArtifact } = await import("@/lib/question-bank-pipeline");
  const questionBank = buildPublishedQuestionBankArtifact();
  const todayQuiz = buildDailyQuizFromQuestionBank(questionBank, date);
  const topic = todayQuiz.topic;
  const quizSummary = todayQuiz.summary;

  try {
    const miniLesson = await generateDailyMiniLesson(topic, quizSummary, date);
    const curriculumTheme = deriveTheme(miniLesson.topic);
    const { audioUrl, videoUrl } = await generateLessonMedia(miniLesson);
    await db.collection("daily_mini_lessons").doc(date).set({
      ...miniLesson,
      curriculumTheme,
      audioUrl: audioUrl ?? null,
      videoUrl: videoUrl ?? null,
    });
  } catch (miniLessonError) {
    console.error("Mini-lesson generation failed (non-fatal):", miniLessonError);
  }

  return NextResponse.json({
    status: "ok",
    date,
    headline: document.headline,
  });
}
