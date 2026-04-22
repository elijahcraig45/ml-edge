import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDateKey } from "@/lib/date";
import { getRequiredServerEnv } from "@/lib/env";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { generateDailyDeepDive } from "@/lib/geminiService";
import { fetchTopAiHeadlines } from "@/lib/newsService";

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
    quiz: {
      questions: generated.questions,
    },
    status: "generated" as const,
    sourceArticles: articles,
  };

  await db.collection("daily_content").doc(date).set(document, { merge: true });

  const bankBatch = db.batch();
  generated.questions.forEach((question, index) => {
    const bankDocId = `${date}-${index + 1}`;
    bankBatch.set(
      db.collection("question_bank").doc(bankDocId),
      {
        id: bankDocId,
        prompt: question.prompt,
        options: question.options,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        topic: question.topic,
        level: question.level,
        date,
        source: "daily",
      },
      { merge: true },
    );
  });
  await bankBatch.commit();

  return NextResponse.json({
    status: "ok",
    date,
    headline: document.headline,
    questionCount: document.quiz.questions.length,
  });
}
