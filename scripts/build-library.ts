import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Octokit } from "@octokit/rest";
import {
  DEFAULT_INGEST_MODEL,
  IngestLessonError,
  ingestLessonSource,
  resolveIngestModel,
  type LessonIngestionInput,
} from "../lib/ingestor";
import { getAdminFirestore } from "../lib/firebase/admin";

type RepoConfig = {
  owner: string;
  repo: string;
  courseTitle: string;
};

type TreeEntry = {
  path: string;
  sha: string;
};

type RepositoryTree = {
  branch: string;
  entries: TreeEntry[];
};

type ManifestItem = {
  id: string;
  repository: string;
  sourcePath: string;
  curriculumTrack: string;
  firestoreDocPath: string;
};

type ManifestError = {
  repository: string;
  sourcePath: string;
  message: string;
};

type UsageBudget = {
  model: string;
  maxRequests: number;
  requestsUsed: number;
  requestDelayMs: number;
  stoppedByBudget: boolean;
};

const REPOSITORIES: RepoConfig[] = [
  {
    owner: "mml-book",
    repo: "mml-book.github.io",
    courseTitle: "Mathematics for Machine Learning Library",
  },
  {
    owner: "mossr",
    repo: "machine_learning_book",
    courseTitle: "Machine Learning Lecture Library",
  },
  {
    owner: "ageron",
    repo: "handson-ml3",
    courseTitle: "Hands-On ML Functional Library",
  },
];

const GEMINI_MODEL = resolveIngestModel() || DEFAULT_INGEST_MODEL;
const SAFE_FREE_TIER_REQUEST_CAP = Number(
  process.env.GEMINI_FREE_TIER_REQUEST_CAP ?? "20",
);
const REQUEST_DELAY_MS = Number(process.env.GEMINI_REQUEST_DELAY_MS ?? "8000");
const INCLUDED_SOURCE_PATHS = new Set(
  (process.env.LIBRARY_INCLUDE_PATHS ?? "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.length > 0),
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function repoKey(config: RepoConfig) {
  return `${config.owner}-${config.repo}`.toLowerCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function classifyTrack(config: RepoConfig, sourcePath: string) {
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".tex") {
    return "Science Track" as const;
  }

  if (extension === ".ipynb") {
    return "Functional Track" as const;
  }

  if (config.repo === "handson-ml3") {
    return "Functional Track" as const;
  }

  return "Science Track" as const;
}

function classifySourceFormat(sourcePath: string): LessonIngestionInput["sourceFormat"] {
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".tex") {
    return "latex";
  }

  if (extension === ".ipynb") {
    return "notebook";
  }

  return "markdown";
}

function isSupportedPath(config: RepoConfig, sourcePath: string) {
  if (
    INCLUDED_SOURCE_PATHS.size > 0 &&
    !INCLUDED_SOURCE_PATHS.has(`${config.owner}/${config.repo}:${sourcePath}`)
  ) {
    return false;
  }

  const extension = path.extname(sourcePath).toLowerCase();

  if (config.repo === "mml-book.github.io") {
    return (
      (extension === ".md" &&
        (sourcePath === "slopes-expectations.md" ||
          sourcePath.startsWith("tutorials/"))) ||
      sourcePath.startsWith("tutorials/")
    );
  }

  if (config.repo === "machine_learning_book") {
    return (
      extension === ".tex" &&
      (/^tex\/chapter\/ch\d+.*\.tex$/i.test(sourcePath) ||
        sourcePath === "tex/chapter/boosting.tex")
    );
  }

  if (config.repo === "handson-ml3") {
    if (extension !== ".ipynb") {
      return false;
    }

    const fileName = path.basename(sourcePath).toLowerCase();

    if (sourcePath.includes("/") || fileName === "index.ipynb") {
      return false;
    }

    if (fileName.startsWith("tools_")) {
      return false;
    }

    return true;
  }

  return false;
}

function humanizeName(value: string) {
  return value
    .replace(/\.[^.]+$/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function extractModuleTitle(sourcePath: string) {
  const directory = path.dirname(sourcePath);

  if (!directory || directory === ".") {
    return "Imported Library Module";
  }

  return humanizeName(path.basename(directory));
}

function extractSourceTitle(sourcePath: string) {
  return humanizeName(path.basename(sourcePath));
}

function renderProgress(current: number, total: number, label: string) {
  const width = 28;
  const ratio = total === 0 ? 1 : current / total;
  const filled = Math.round(width * ratio);
  const bar = `${"=".repeat(filled)}${" ".repeat(width - filled)}`;
  process.stdout.write(`\r[${bar}] ${current}/${total} ${label}`);
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf8");
}

function extractNotebookText(sourceText: string) {
  const notebook = JSON.parse(sourceText) as {
    cells?: Array<{
      cell_type?: string;
      source?: string[] | string;
    }>;
  };
  const cells = Array.isArray(notebook.cells) ? notebook.cells : [];

  return cells
    .map((cell, index) => {
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : typeof cell.source === "string"
          ? cell.source
          : "";

      if (cell.cell_type === "code") {
        return `Notebook cell ${index + 1} (code):\n${source}`;
      }

      return `Notebook cell ${index + 1} (markdown):\n${source}`;
    })
    .join("\n\n");
}

async function getRepositoryTree(
  octokit: Octokit,
  config: RepoConfig,
): Promise<RepositoryTree> {
  const branch = await octokit.rest.repos.getBranch({
    owner: config.owner,
    repo: config.repo,
    branch: "master",
  }).catch(async () => {
    const repository = await octokit.rest.repos.get({
      owner: config.owner,
      repo: config.repo,
    });

    return octokit.rest.repos.getBranch({
      owner: config.owner,
      repo: config.repo,
      branch: repository.data.default_branch,
    });
  });

  const tree = await octokit.rest.git.getTree({
    owner: config.owner,
    repo: config.repo,
    tree_sha: branch.data.commit.sha,
    recursive: "true",
  });

  return {
    branch: branch.data.name,
    entries: tree.data.tree
      .map((item) => {
        if (
          item.type !== "blob" ||
          typeof item.path !== "string" ||
          typeof item.sha !== "string" ||
          !isSupportedPath(config, item.path)
        ) {
          return null;
        }

        return {
          path: item.path,
          sha: item.sha,
        };
      })
      .filter((item): item is TreeEntry => item !== null)
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
}

async function fetchSourceText(
  octokit: Octokit,
  config: RepoConfig,
  entry: TreeEntry,
) {
  const blob = await octokit.rest.git.getBlob({
    owner: config.owner,
    repo: config.repo,
    file_sha: entry.sha,
  });
  const raw = decodeBase64(blob.data.content);

  if (entry.path.toLowerCase().endsWith(".ipynb")) {
    return extractNotebookText(raw);
  }

  return raw;
}

async function main() {
  const db = getAdminFirestore();

  if (!db) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID plus credentials or ADC before running build-library.",
    );
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  const manifestItems: ManifestItem[] = [];
  const manifestErrors: ManifestError[] = [];
  const startedAt = new Date().toISOString();
  const usageBudget: UsageBudget = {
    model: GEMINI_MODEL,
    maxRequests: SAFE_FREE_TIER_REQUEST_CAP,
    requestsUsed: 0,
    requestDelayMs: REQUEST_DELAY_MS,
    stoppedByBudget: false,
  };

  const repoEntries = await Promise.all(
    REPOSITORIES.map(async (config) => ({
      config,
      tree: await getRepositoryTree(octokit, config),
    })),
  );
  const totalFiles = repoEntries.reduce(
    (count, item) => count + item.tree.entries.length,
    0,
  );
  let processed = 0;

  for (const { config, tree } of repoEntries) {
    const repositoryId = repoKey(config);

    await db.collection("curriculum_library_repositories").doc(repositoryId).set(
      {
        owner: config.owner,
        repo: config.repo,
        courseTitle: config.courseTitle,
        branch: tree.branch,
        sourceCount: tree.entries.length,
        updatedAt: startedAt,
      },
      { merge: true },
    );

    for (const entry of tree.entries) {
      if (usageBudget.requestsUsed >= usageBudget.maxRequests) {
        usageBudget.stoppedByBudget = true;
        break;
      }

      processed += 1;
      renderProgress(
        processed,
        totalFiles,
        `${config.owner}/${config.repo}:${entry.path}`,
      );

      try {
        const sourceText = await fetchSourceText(octokit, config, entry);
        const sourceTitle = extractSourceTitle(entry.path);
        const curriculumTrack = classifyTrack(config, entry.path);
        const remainingBudget = usageBudget.maxRequests - usageBudget.requestsUsed;
        const { lesson, requestCount } = await ingestLessonSource({
          sourceText,
          sourceFormat: classifySourceFormat(entry.path),
          sourceTitle,
          lessonId: `${repositoryId}-${slugify(entry.path)}`,
          courseTitle: config.courseTitle,
          moduleTitle: extractModuleTitle(entry.path),
          targetAudience:
            "Senior SWE preparing for Georgia Tech-level ML and ML engineering work",
          curriculumTrack,
          practiceProblemCount: 10,
          sourcePath: entry.path,
          repository: `${config.owner}/${config.repo}`,
          allowRepair: remainingBudget >= 2,
        });
        usageBudget.requestsUsed += requestCount;
        const lessonDocId = lesson.id;
        const sourceUrl = `https://github.com/${config.owner}/${config.repo}/blob/${tree.branch}/${entry.path}`;

        await db.collection("curriculum_library_lessons").doc(lessonDocId).set({
          ...lesson,
          repositoryOwner: config.owner,
          repositoryName: config.repo,
          repositoryId,
          sourcePath: entry.path,
          sourceSha: entry.sha,
          sourceUrl,
          importedAt: new Date().toISOString(),
        });

        manifestItems.push({
          id: lessonDocId,
          repository: `${config.owner}/${config.repo}`,
          sourcePath: entry.path,
          curriculumTrack,
          firestoreDocPath: `curriculum_library_lessons/${lessonDocId}`,
        });
      } catch (error) {
        usageBudget.requestsUsed +=
          error instanceof IngestLessonError ? error.requestCount : 1;
        manifestErrors.push({
          repository: `${config.owner}/${config.repo}`,
          sourcePath: entry.path,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (usageBudget.requestsUsed < usageBudget.maxRequests) {
        await sleep(usageBudget.requestDelayMs);
      }
    }

    if (usageBudget.stoppedByBudget) {
      break;
    }
  }

  process.stdout.write("\n");

  const finishedAt = new Date().toISOString();
  const manifest = {
    startedAt,
    finishedAt,
    repositoryCount: REPOSITORIES.length,
    processedFiles: totalFiles,
    importedLessons: manifestItems.length,
    failedLessons: manifestErrors.length,
    usageBudget,
    items: manifestItems,
    errors: manifestErrors,
  };

  await mkdir(process.cwd(), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  await db.collection("curriculum_library_manifests").doc(finishedAt).set(manifest);

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
