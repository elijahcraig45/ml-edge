/**
 * Scaffolds a new lesson directory.
 *
 *   npm run curriculum:new -- --tier t1-foundations --stage s01-ground-floor \
 *     --lesson l07-something --title "Something" --id t1/s01/l07
 *
 * Writes a lesson.md whose frontmatter already satisfies the schema, so the
 * new lesson passes `curriculum:check` immediately and you can start writing
 * rather than fighting validation. It does NOT edit stage.yaml — add the slug
 * to the stage's `lessons:` list when the lesson is ready to appear.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const tier = arg("tier");
  const stage = arg("stage");
  const lesson = arg("lesson");
  const title = arg("title") ?? "Untitled lesson";
  const id = arg("id");

  if (!tier || !stage || !lesson || !id) {
    console.error(
      "Usage: npm run curriculum:new -- --tier <tier> --stage <stage> --lesson <slug> --id <t1/s01/l07> [--title <title>]",
    );
    process.exit(1);
  }

  const dir = path.join(process.cwd(), "content", tier, stage, lesson);
  const exists = await fs.stat(dir).then(() => true).catch(() => false);
  if (exists) {
    console.error(`${dir} already exists.`);
    process.exit(1);
  }

  await fs.mkdir(path.join(dir, "exercises"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "lesson.md"),
    `---
id: ${id}
title: ${title}
tier: ${tier}
stage: ${stage}
status: draft
estimatedMinutes: 40
objectives:
  - TODO: what the learner can do afterwards that they could not before.
prerequisites: []
misconceptions:
  - "TODO: a belief learners actually hold, and why it is wrong."
masteryChecklist:
  - TODO: something the learner can check for themselves.
runtimes:
  - engine: python
---

TODO: open with the question this lesson answers, not with a definition.

## First section

\`\`\`python runnable id=example
print("edit me")
\`\`\`

:::checkpoint{id=cp-1 rubric="TODO,TODO"}
TODO: ask the learner to articulate the idea before moving on.
:::

:::quiz{id=quiz-1 passing=2}
- id: q1
  prompt: "TODO"
  options: ["TODO", "TODO", "TODO", "TODO"]
  answerIndex: 0
  explanation: "TODO: say why the right answer is right AND why the tempting wrong one is wrong."
:::
`,
    "utf8",
  );

  console.log(`Created ${path.relative(process.cwd(), dir)}`);
  console.log("Next: write the lesson, then add its slug to the stage's lessons: list.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
