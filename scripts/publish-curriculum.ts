import { publishCurriculumArtifact } from "../lib/curriculum-pipeline";

async function main() {
  const result = await publishCurriculumArtifact();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
