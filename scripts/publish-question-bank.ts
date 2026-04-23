import { publishQuestionBankArtifact } from "../lib/question-bank-pipeline";

async function main() {
  const result = await publishQuestionBankArtifact();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
