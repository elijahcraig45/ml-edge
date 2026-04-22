import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getRequiredServerEnv } from "@/lib/env";
import { seedCurriculum } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getProvidedSecret(
  authorizationHeader: string | null,
  adminHeader: string | null,
) {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  return adminHeader;
}

export async function POST() {
  const configuredSecret = getRequiredServerEnv("CRON_SECRET");
  const headerStore = await headers();
  const providedSecret = getProvidedSecret(
    headerStore.get("authorization"),
    headerStore.get("x-admin-secret"),
  );

  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedCurriculum();

  return NextResponse.json({
    status: "ok",
    ...result,
  });
}
