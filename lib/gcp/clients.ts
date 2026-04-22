import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";
import { getOptionalServerEnv } from "@/lib/env";

export function getGcpProjectId() {
  return (
    getOptionalServerEnv("FIREBASE_PROJECT_ID") ??
    getOptionalServerEnv("GOOGLE_CLOUD_PROJECT")
  );
}

export function getGcsClient() {
  const projectId = getGcpProjectId();

  return projectId ? new Storage({ projectId }) : new Storage();
}

export function getBigQueryClient() {
  const projectId = getGcpProjectId();

  return projectId ? new BigQuery({ projectId }) : new BigQuery();
}
