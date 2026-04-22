import { getOptionalServerEnv } from "@/lib/env";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getBigQueryClient, getGcsClient } from "@/lib/gcp/clients";
import { ML_ENGINEER_PROGRAM } from "@/lib/curriculum-program";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Table } from "@google-cloud/bigquery";
import {
  CURRICULUM_PREREQUISITE_GRAPH,
  CURRICULUM_RESOURCE_TRACKS,
  OPEN_RESOURCE_CATALOG,
} from "@/lib/resource-catalog";
import type { PublishedCurriculumArtifact } from "@/lib/types";

function getCurriculumDatasetName() {
  return getOptionalServerEnv("BIGQUERY_CURRICULUM_DATASET") ?? "curriculum";
}

async function loadRowsIntoBigQueryTable(
  table: Table,
  fileName: string,
  rows: object[],
) {
  if (rows.length === 0) {
    return;
  }

  const tempDirectory = await mkdtemp(join(tmpdir(), "ml-edge-bq-"));
  const filePath = join(tempDirectory, fileName);

  try {
    const payload = rows.map((row) => JSON.stringify(row)).join("\n");
    await writeFile(filePath, payload, "utf8");
    await table.load(filePath, {
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      writeDisposition: "WRITE_APPEND",
    });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export function buildPublishedCurriculumArtifact(): PublishedCurriculumArtifact {
  const timestamp = new Date().toISOString();

  return {
    version: `curriculum-${timestamp.replace(/[:.]/g, "-")}`,
    generatedAt: timestamp,
    strategy:
      "Open-license source catalog + authored ML engineer program + storage-backed serving snapshot",
    resources: OPEN_RESOURCE_CATALOG,
    tracks: CURRICULUM_RESOURCE_TRACKS,
    prerequisiteGraph: CURRICULUM_PREREQUISITE_GRAPH,
    courses: ML_ENGINEER_PROGRAM,
  };
}

async function uploadArtifactToGcs(artifact: PublishedCurriculumArtifact) {
  const bucketName = getOptionalServerEnv("GCS_CURRICULUM_BUCKET");

  if (!bucketName) {
    return { bucketName: null, objectPrefix: null, uploaded: false };
  }

  const storage = getGcsClient();

  if (!storage) {
    throw new Error("Google Cloud Storage client is not configured.");
  }

  const bucket = storage.bucket(bucketName);
  const objectPrefix = `curriculum/${artifact.version}`;

  await bucket.file(`${objectPrefix}/artifact.json`).save(
    JSON.stringify(artifact, null, 2),
    {
      contentType: "application/json",
      resumable: false,
    },
  );

  await bucket.file("curriculum/published/latest.json").save(
    JSON.stringify(artifact, null, 2),
    {
      contentType: "application/json",
      resumable: false,
    },
  );

  await bucket.file("curriculum/sources/open-resource-catalog.json").save(
    JSON.stringify(artifact.resources, null, 2),
    {
      contentType: "application/json",
      resumable: false,
    },
  );

  return { bucketName, objectPrefix, uploaded: true };
}

async function publishArtifactToFirestore(
  artifact: PublishedCurriculumArtifact,
  gcsStatus: { bucketName: string | null; objectPrefix: string | null },
) {
  const db = getAdminFirestore();

  if (!db) {
    return {
      enabled: false,
      collections: [] as string[],
    };
  }

  const writes = [
    db.collection("curriculum_meta").doc("current").set({
      version: artifact.version,
      generatedAt: artifact.generatedAt,
      strategy: artifact.strategy,
      gcsBucket: gcsStatus.bucketName,
      gcsObjectPrefix: gcsStatus.objectPrefix,
      courseCount: artifact.courses.length,
      resourceCount: artifact.resources.length,
      trackCount: artifact.tracks.length,
    }),
    ...artifact.courses.map((course) =>
      db.collection("curriculum_courses").doc(course.id).set(course),
    ),
    ...artifact.tracks.map((track) =>
      db.collection("curriculum_tracks").doc(track.courseId).set(track),
    ),
    ...artifact.resources.map((resource) =>
      db.collection("curriculum_resources").doc(resource.id).set(resource),
    ),
  ];

  await Promise.all(writes);

  return {
    enabled: true,
    collections: [
      "curriculum_meta",
      "curriculum_courses",
      "curriculum_tracks",
      "curriculum_resources",
    ],
  };
}

async function publishArtifactToBigQuery(artifact: PublishedCurriculumArtifact) {
  const datasetName = getCurriculumDatasetName();

  const bigquery = getBigQueryClient();

  if (!bigquery) {
    throw new Error("BigQuery client is not configured.");
  }

  const dataset = bigquery.dataset(datasetName);
  const [datasetExists] = await dataset.exists();

  if (!datasetExists) {
    await dataset.create({ location: "US" });
  }

  const resourcesTable = dataset.table("resource_catalog");
  const edgesTable = dataset.table("curriculum_edges");
  const versionsTable = dataset.table("curriculum_versions");

  const [resourcesExists] = await resourcesTable.exists();
  if (!resourcesExists) {
    await resourcesTable.create({
      schema: [
        { name: "version", type: "STRING" },
        { name: "resource_id", type: "STRING" },
        { name: "title", type: "STRING" },
        { name: "provider", type: "STRING" },
        { name: "url", type: "STRING" },
        { name: "format", type: "STRING" },
        { name: "access_model", type: "STRING" },
        { name: "license", type: "STRING" },
        { name: "difficulty", type: "STRING" },
        { name: "topics", type: "STRING", mode: "REPEATED" },
      ],
    });
  }

  const [edgesExists] = await edgesTable.exists();
  if (!edgesExists) {
    await edgesTable.create({
      schema: [
        { name: "version", type: "STRING" },
        { name: "from_course_id", type: "STRING" },
        { name: "to_course_id", type: "STRING" },
        { name: "reason", type: "STRING" },
      ],
    });
  }

  const [versionsExists] = await versionsTable.exists();
  if (!versionsExists) {
    await versionsTable.create({
      schema: [
        { name: "version", type: "STRING" },
        { name: "generated_at", type: "TIMESTAMP" },
        { name: "strategy", type: "STRING" },
        { name: "course_count", type: "INTEGER" },
        { name: "resource_count", type: "INTEGER" },
        { name: "track_count", type: "INTEGER" },
      ],
    });
  }

  await loadRowsIntoBigQueryTable(versionsTable, "versions.ndjson", [
    {
      version: artifact.version,
      generated_at: artifact.generatedAt,
      strategy: artifact.strategy,
      course_count: artifact.courses.length,
      resource_count: artifact.resources.length,
      track_count: artifact.tracks.length,
    },
  ]);

  await loadRowsIntoBigQueryTable(
    resourcesTable,
    "resources.ndjson",
    artifact.resources.map((resource) => ({
      version: artifact.version,
      resource_id: resource.id,
      title: resource.title,
      provider: resource.provider,
      url: resource.url,
      format: resource.format,
      access_model: resource.accessModel,
      license: resource.license ?? null,
      difficulty: resource.difficulty,
      topics: resource.topics,
    })),
  );

  await loadRowsIntoBigQueryTable(
    edgesTable,
    "edges.ndjson",
    artifact.prerequisiteGraph.map((edge) => ({
      version: artifact.version,
      from_course_id: edge.fromCourseId,
      to_course_id: edge.toCourseId,
      reason: edge.reason,
    })),
  );

  return { datasetName, inserted: true };
}

export async function publishCurriculumArtifact() {
  const artifact = buildPublishedCurriculumArtifact();
  const gcsStatus = await uploadArtifactToGcs(artifact);
  const firestoreStatus = await publishArtifactToFirestore(artifact, gcsStatus);
  const bigQueryStatus = await publishArtifactToBigQuery(artifact);

  return {
    version: artifact.version,
    courseCount: artifact.courses.length,
    resourceCount: artifact.resources.length,
    trackCount: artifact.tracks.length,
    gcs: gcsStatus,
    bigQuery: bigQueryStatus,
    firestore: firestoreStatus,
  };
}

export async function readPublishedCurriculumFromGcs() {
  const bucketName = getOptionalServerEnv("GCS_CURRICULUM_BUCKET");

  if (!bucketName) {
    return null;
  }

  const storage = getGcsClient();

  if (!storage) {
    return null;
  }

  const file = storage.bucket(bucketName).file("curriculum/published/latest.json");
  const [exists] = await file.exists();

  if (!exists) {
    return null;
  }

  const [contents] = await file.download();

  return JSON.parse(contents.toString("utf8")) as PublishedCurriculumArtifact;
}
