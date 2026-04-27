import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { getGcsClient } from "@/lib/gcp/clients";
import { getOptionalServerEnv } from "@/lib/env";
import type { DailyContentDocument, DailyMiniLesson } from "@/lib/types";

const execFileAsync = promisify(execFile);

// ─── Theme classifier ────────────────────────────────────────────────────────

const THEME_KEYWORDS: Array<{ theme: string; keywords: string[] }> = [
  {
    theme: "Large Language Models",
    keywords: [
      "llm",
      "gpt",
      "language model",
      "transformer",
      "attention",
      "token",
      "prompt",
      "rag",
      "retrieval",
      "embedding",
      "fine-tun",
      "context window",
      "instruction tun",
    ],
  },
  {
    theme: "Reinforcement Learning",
    keywords: [
      "reinforcement",
      "rlhf",
      "reward",
      "policy",
      "q-learn",
      "ppo",
      "dpo",
      "grpo",
      "actor-critic",
      "bandit",
    ],
  },
  {
    theme: "Computer Vision & Generative AI",
    keywords: [
      "vision",
      "image",
      "cnn",
      "diffusion",
      "stable diffusion",
      "video generation",
      "multimodal",
      "clip",
      "vae",
      "gan",
    ],
  },
  {
    theme: "MLOps & Infrastructure",
    keywords: [
      "deployment",
      "inference",
      "serving",
      "pipeline",
      "latency",
      "throughput",
      "quantiz",
      "distill",
      "pruning",
      "mlops",
      "monitoring",
    ],
  },
  {
    theme: "Data & Training",
    keywords: [
      "training",
      "dataset",
      "overfitting",
      "regulariz",
      "batch",
      "gradient",
      "backprop",
      "loss function",
      "augment",
      "pre-train",
    ],
  },
];

export function deriveTheme(topic: string): string {
  const lower = topic.toLowerCase();

  for (const { theme, keywords } of THEME_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return theme;
  }

  return "AI Strategy & Industry";
}

// ─── Podcast script builder ──────────────────────────────────────────────────

export function buildPodcastScript(lesson: DailyMiniLesson): string {
  const parts = [
    `Welcome to ML Edge. Today's topic: ${lesson.topic}.`,
    lesson.headline + ".",
    lesson.whyItMatters,
    ...lesson.sections.map((s) => `${s.title}. ${s.body}`),
    lesson.workedExample ? `Worked example. ${lesson.workedExample}` : "",
    lesson.commonPitfalls.length > 0
      ? `A few common pitfalls to watch for. ${lesson.commonPitfalls.join(". ")}.`
      : "",
    lesson.bridgeToQuiz ? `Before you take today's quiz — ${lesson.bridgeToQuiz}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}

// ─── GCP auth (metadata server — works on Cloud Run automatically) ───────────

async function getGcpAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { access_token?: string };

    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── TTS synthesis ───────────────────────────────────────────────────────────

async function synthesizeSpeech(text: string): Promise<Buffer | null> {
  const token = await getGcpAccessToken();

  if (!token) {
    console.warn("No GCP metadata token — TTS skipped (only works on Cloud Run)");
    return null;
  }

  const body = {
    input: { text },
    voice: { languageCode: "en-US", name: "en-US-Neural2-D" },
    audioConfig: { audioEncoding: "MP3", speakingRate: 0.95, pitch: -1.0 },
  };

  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("TTS API error:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { audioContent?: string };

  if (!data.audioContent) return null;

  return Buffer.from(data.audioContent, "base64");
}

// ─── ffmpeg still-image video ─────────────────────────────────────────────────

const FONT_BOLD = "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf";
const FONT_REG = "/usr/share/fonts/dejavu/DejaVuSans.ttf";

/** Escape special characters for ffmpeg drawtext filter values. */
function esc(text: string, maxLen = 72): string {
  return text
    .slice(0, maxLen)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/[[\]]/g, "")
    .replace(/,/g, "\\,");
}

async function renderStillVideo(
  audioPath: string,
  lesson: DailyMiniLesson,
  outputPath: string,
): Promise<void> {
  const topic = esc(lesson.topic, 60);
  const headline = esc(lesson.headline, 68);
  const date = esc(lesson.date);

  const vf = [
    // Brand name
    `drawtext=fontfile=${FONT_BOLD}:text='ML EDGE':fontsize=26:fontcolor=0x6366f1:x=80:y=72`,
    // Date
    `drawtext=fontfile=${FONT_REG}:text='${date}':fontsize=22:fontcolor=0x475569:x=80:y=108`,
    // Topic
    `drawtext=fontfile=${FONT_REG}:text='${topic}':fontsize=34:fontcolor=0xa5b4fc:x=80:y=420`,
    // Headline
    `drawtext=fontfile=${FONT_BOLD}:text='${headline}':fontsize=50:fontcolor=white:x=80:y=464:line_spacing=14`,
    // Footer
    `drawtext=fontfile=${FONT_REG}:text='mle-edge.dev / daily mini-lesson':fontsize=22:fontcolor=0x334155:x=80:y=980`,
  ].join(",");

  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0f172a:size=1920x1080:rate=25",
    "-i",
    audioPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "stillimage",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-pix_fmt",
    "yuv420p",
    "-shortest",
    outputPath,
  ]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

// ─── Deep-dive podcast script ────────────────────────────────────────────────

export function buildDeepDiveScript(content: DailyContentDocument): string {
  const parts: string[] = [
    `Welcome to ML Edge Daily Signal. ${content.date}.`,
    content.headline + ".",
    content.deepDive.tldr,
  ];

  for (const theme of content.deepDive.themes) {
    parts.push(`Theme: ${theme.title}.`);
    parts.push(theme.analysis);
    if (theme.practicalImplication) {
      parts.push(`For practitioners: ${theme.practicalImplication}`);
    }
  }

  if (content.deepDive.industryState) {
    parts.push(`Industry perspective. ${content.deepDive.industryState}`);
  }

  if (content.deepDive.keyTakeaways && content.deepDive.keyTakeaways.length > 0) {
    parts.push(
      `Key takeaways. ${content.deepDive.keyTakeaways.join(". ")}.`,
    );
  }

  parts.push("That's your ML Edge signal for today. Stay sharp.");

  return parts.filter(Boolean).join("\n\n");
}

export async function generateDeepDiveMedia(
  content: DailyContentDocument,
): Promise<{ audioUrl: string | null; videoUrl: string | null }> {
  const bucketName = getOptionalServerEnv("GCS_MEDIA_BUCKET");

  if (!bucketName) {
    return { audioUrl: null, videoUrl: null };
  }

  const script = buildDeepDiveScript(content);
  const audioBuffer = await synthesizeSpeech(script);

  if (!audioBuffer) {
    return { audioUrl: null, videoUrl: null };
  }

  const storage = getGcsClient();
  const bucket = storage.bucket(bucketName);
  const audioObjectPath = `deep-dives/${content.date}/audio.mp3`;
  const videoObjectPath = `deep-dives/${content.date}/video.mp4`;

  await bucket.file(audioObjectPath).save(audioBuffer, {
    metadata: { contentType: "audio/mpeg" },
  });
  const audioUrl = `https://storage.googleapis.com/${bucketName}/${audioObjectPath}`;

  let videoUrl: string | null = null;
  const tmpDir = join(tmpdir(), `deepdive-${content.date}`);

  try {
    await mkdir(tmpDir, { recursive: true });
    const tmpAudio = join(tmpDir, "audio.mp3");
    const tmpVideo = join(tmpDir, "video.mp4");

    await writeFile(tmpAudio, audioBuffer);

    // Render still-image video with deep-dive branding
    const headline = esc(content.headline, 68);
    const date = esc(content.date);
    const themeCount = content.deepDive.themes.length;
    const themeLine = esc(
      content.deepDive.themes.map((t) => t.title).join(" · "),
      80,
    );

    const vf = [
      `drawtext=fontfile=${FONT_BOLD}:text='ML EDGE':fontsize=26:fontcolor=0x6366f1:x=80:y=72`,
      `drawtext=fontfile=${FONT_REG}:text='${date}':fontsize=22:fontcolor=0x475569:x=80:y=108`,
      `drawtext=fontfile=${FONT_REG}:text='Daily Signal — ${themeCount} themes':fontsize=34:fontcolor=0xa5b4fc:x=80:y=420`,
      `drawtext=fontfile=${FONT_BOLD}:text='${headline}':fontsize=50:fontcolor=white:x=80:y=464:line_spacing=14`,
      `drawtext=fontfile=${FONT_REG}:text='${themeLine}':fontsize=22:fontcolor=0x64748b:x=80:y=560`,
      `drawtext=fontfile=${FONT_REG}:text='mle-edge.dev / signal':fontsize=22:fontcolor=0x334155:x=80:y=980`,
    ].join(",");

    await execFileAsync("ffmpeg", [
      "-y", "-f", "lavfi",
      "-i", `color=c=0x0f172a:size=1920x1080:rate=25`,
      "-i", tmpAudio,
      "-vf", vf,
      "-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage",
      "-c:a", "aac", "-b:a", "128k",
      "-pix_fmt", "yuv420p", "-shortest",
      tmpVideo,
    ]);

    const videoBuffer = await readFile(tmpVideo);
    await bucket.file(videoObjectPath).save(videoBuffer, {
      metadata: { contentType: "video/mp4" },
    });
    videoUrl = `https://storage.googleapis.com/${bucketName}/${videoObjectPath}`;
  } catch (err) {
    console.error("Deep-dive video render failed (non-fatal):", err);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  return { audioUrl, videoUrl };
}

export async function generateLessonMedia(
  lesson: DailyMiniLesson,
): Promise<{ audioUrl: string | null; videoUrl: string | null }> {
  const bucketName = getOptionalServerEnv("GCS_MEDIA_BUCKET");

  if (!bucketName) {
    console.warn("GCS_MEDIA_BUCKET not set — skipping media generation");
    return { audioUrl: null, videoUrl: null };
  }

  const script = buildPodcastScript(lesson);
  const audioBuffer = await synthesizeSpeech(script);

  if (!audioBuffer) {
    return { audioUrl: null, videoUrl: null };
  }

  const storage = getGcsClient();
  const bucket = storage.bucket(bucketName);
  const audioObjectPath = `mini-lessons/${lesson.date}/audio.mp3`;
  const videoObjectPath = `mini-lessons/${lesson.date}/video.mp4`;

  await bucket.file(audioObjectPath).save(audioBuffer, {
    metadata: { contentType: "audio/mpeg" },
  });
  const audioUrl = `https://storage.googleapis.com/${bucketName}/${audioObjectPath}`;

  let videoUrl: string | null = null;
  const tmpDir = join(tmpdir(), `lesson-${lesson.date}`);

  try {
    await mkdir(tmpDir, { recursive: true });
    const tmpAudio = join(tmpDir, "audio.mp3");
    const tmpVideo = join(tmpDir, "video.mp4");

    await writeFile(tmpAudio, audioBuffer);
    await renderStillVideo(tmpAudio, lesson, tmpVideo);

    const videoBuffer = await readFile(tmpVideo);

    await bucket.file(videoObjectPath).save(videoBuffer, {
      metadata: { contentType: "video/mp4" },
    });
    videoUrl = `https://storage.googleapis.com/${bucketName}/${videoObjectPath}`;
  } catch (err) {
    console.error("Video render failed (non-fatal):", err);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  return { audioUrl, videoUrl };
}
