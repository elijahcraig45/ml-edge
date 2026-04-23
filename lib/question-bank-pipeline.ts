import { getAuthoredQuestionBank, getAuthoredQuestionBankTopics, getAuthoredQuestionCountsByLevel } from "@/lib/authored-question-bank";
import { getOptionalServerEnv } from "@/lib/env";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getGcsClient } from "@/lib/gcp/clients";
import type { PublishedQuestionBankArtifact } from "@/lib/types";

const QUESTION_BANK_STRATEGY =
  "Authored foundations question bank spanning DS&A and ML/AI, published as a versioned GCS artifact with Firestore metadata and deterministic daily quiz rotation";

export function buildPublishedQuestionBankArtifact(): PublishedQuestionBankArtifact {
  const timestamp = new Date().toISOString();
  const questions = getAuthoredQuestionBank();
  const topics = getAuthoredQuestionBankTopics();
  const counts = getAuthoredQuestionCountsByLevel();

  return {
    version: `question-bank-${timestamp.replace(/[:.]/g, "-")}`,
    generatedAt: timestamp,
    strategy: QUESTION_BANK_STRATEGY,
    countsByLevel: {
      easy: counts.easy,
      medium: counts.medium,
      hard: counts.hard,
      expert: counts.expert,
    },
    questionCount: counts.total,
    topicCount: topics.length,
    topics,
    questions,
  };
}

async function uploadArtifactToGcs(artifact: PublishedQuestionBankArtifact) {
  const bucketName = getOptionalServerEnv("GCS_CURRICULUM_BUCKET");

  if (!bucketName) {
    return { bucketName: null, objectPrefix: null, uploaded: false };
  }

  const storage = getGcsClient();

  if (!storage) {
    throw new Error("Google Cloud Storage client is not configured.");
  }

  const bucket = storage.bucket(bucketName);
  const objectPrefix = `question-bank/${artifact.version}`;
  const payload = JSON.stringify(artifact, null, 2);

  await bucket.file(`${objectPrefix}/artifact.json`).save(payload, {
    contentType: "application/json",
    resumable: false,
  });

  await bucket.file("question-bank/published/latest.json").save(payload, {
    contentType: "application/json",
    resumable: false,
  });

  return { bucketName, objectPrefix, uploaded: true };
}

async function publishArtifactMetadataToFirestore(
  artifact: PublishedQuestionBankArtifact,
  gcsStatus: { bucketName: string | null; objectPrefix: string | null },
) {
  const db = getAdminFirestore();

  if (!db) {
    return {
      enabled: false,
      collections: [] as string[],
    };
  }

  await db.collection("question_bank_meta").doc("current").set({
    version: artifact.version,
    generatedAt: artifact.generatedAt,
    strategy: artifact.strategy,
    gcsBucket: gcsStatus.bucketName,
    gcsObjectPrefix: gcsStatus.objectPrefix,
    questionCount: artifact.questionCount,
    topicCount: artifact.topicCount,
    countsByLevel: artifact.countsByLevel,
  });

  return {
    enabled: true,
    collections: ["question_bank_meta"],
  };
}

export async function publishQuestionBankArtifact() {
  const artifact = buildPublishedQuestionBankArtifact();
  const gcsStatus = await uploadArtifactToGcs(artifact);
  const firestoreStatus = await publishArtifactMetadataToFirestore(
    artifact,
    gcsStatus,
  );

  return {
    version: artifact.version,
    questionCount: artifact.questionCount,
    topicCount: artifact.topicCount,
    countsByLevel: artifact.countsByLevel,
    gcs: gcsStatus,
    firestore: firestoreStatus,
  };
}

export async function readPublishedQuestionBankFromGcs() {
  const bucketName = getOptionalServerEnv("GCS_CURRICULUM_BUCKET");

  if (!bucketName) {
    return null;
  }

  const storage = getGcsClient();

  if (!storage) {
    return null;
  }

  const file = storage
    .bucket(bucketName)
    .file("question-bank/published/latest.json");
  const [exists] = await file.exists();

  if (!exists) {
    return null;
  }

  const [contents] = await file.download();

  return JSON.parse(
    contents.toString("utf8"),
  ) as PublishedQuestionBankArtifact;
}
