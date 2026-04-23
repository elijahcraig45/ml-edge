import "server-only";

import { getRequiredServerEnv } from "@/lib/env";
import type { NewsArticle } from "@/lib/types";

type NewsApiResponse = {
  status: string;
  articles?: Array<{
    title?: string;
    description?: string;
    url?: string;
    publishedAt?: string;
    source?: {
      name?: string;
    };
  }>;
  message?: string;
};

const NEWS_API_URL = "https://newsapi.org/v2/everything";
const QUERY_PAGE_SIZE = 20;
const MAX_ARTICLES = 12;
const MIN_ARTICLES = 6;
const SOURCE_DIVERSITY_LIMIT = 2;
const LOOKBACK_WINDOWS_HOURS = [24, 72];
const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
]);

const NEWS_QUERIES = [
  '"artificial intelligence" OR "machine learning" OR "large language model" OR AI',
  "OpenAI OR Anthropic OR DeepMind OR Meta AI OR Mistral AI",
  "PyTorch OR TensorFlow OR JAX OR CUDA OR model quantization OR inference OR serving",
];
const BROAD_FALLBACK_QUERY = "AI OR machine learning";
const TECH_SIGNAL_TERMS = [
  "model",
  "llm",
  "large language model",
  "machine learning",
  "artificial intelligence",
  "inference",
  "training",
  "gpu",
  "tpu",
  "cuda",
  "pytorch",
  "tensorflow",
  "jax",
  "transformer",
  "rag",
  "agent",
  "openai",
  "anthropic",
  "deepmind",
  "meta ai",
  "mistral",
  "benchmark",
  "quantization",
  "latency",
  "throughput",
  "vector database",
  "retrieval",
];
const NOISE_TERMS = [
  "election",
  "voters",
  "cricket",
  "football",
  "celebrity",
  "gossip",
  "stock market",
  "wall street",
  "dow jones",
];

type RawNewsArticle = NonNullable<NewsApiResponse["articles"]>[number];

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s*[-|]\s*(reuters|ap news|associated press|bloomberg).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(rawUrl: string) {
  if (!URL.canParse(rawUrl)) {
    return rawUrl;
  }

  const parsed = new URL(rawUrl);
  parsed.hash = "";

  Array.from(parsed.searchParams.keys()).forEach((key) => {
    if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
    }
  });

  // Keep only the canonical path and meaningful query terms.
  if (parsed.searchParams.size === 0) {
    parsed.search = "";
  }

  return parsed.toString();
}

function toNewsArticle(article: RawNewsArticle): NewsArticle | null {
  if (!article.title || !article.url) {
    return null;
  }

  return {
    title: article.title,
    description: article.description ?? "",
    url: normalizeUrl(article.url),
    source: article.source?.name ?? "Unknown Source",
    publishedAt: article.publishedAt ?? new Date().toISOString(),
  };
}

function choosePreferredArticle(current: NewsArticle, candidate: NewsArticle) {
  if (candidate.description.length > current.description.length) {
    return candidate;
  }

  const currentDate = Date.parse(current.publishedAt);
  const candidateDate = Date.parse(candidate.publishedAt);
  if (Number.isFinite(candidateDate) && candidateDate > currentDate) {
    return candidate;
  }

  return current;
}

function isTechnicalArticle(article: NewsArticle) {
  const haystack = `${article.title} ${article.description}`.toLowerCase();
  const signalMatches = TECH_SIGNAL_TERMS.reduce(
    (count, term) => (haystack.includes(term) ? count + 1 : count),
    0,
  );
  const noiseMatches = NOISE_TERMS.reduce(
    (count, term) => (haystack.includes(term) ? count + 1 : count),
    0,
  );

  return signalMatches >= 2 || (signalMatches >= 1 && noiseMatches === 0);
}

function dedupeAndRankArticles(articles: NewsArticle[]) {
  const technicalArticles = articles.filter(isTechnicalArticle);
  const pool =
    technicalArticles.length >= MIN_ARTICLES
      ? technicalArticles
      : technicalArticles.length > 0
        ? technicalArticles
        : articles;
  const byKey = new Map<string, NewsArticle>();

  for (const article of pool) {
    const normalizedTitle = normalizeTitle(article.title);
    const key = normalizedTitle.length > 0 ? normalizedTitle : article.url;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, article);
      continue;
    }

    byKey.set(key, choosePreferredArticle(existing, article));
  }

  const deduped = Array.from(byKey.values()).sort((left, right) => {
    const leftDate = Date.parse(left.publishedAt);
    const rightDate = Date.parse(right.publishedAt);
    return (Number.isFinite(rightDate) ? rightDate : 0) - (Number.isFinite(leftDate) ? leftDate : 0);
  });

  // First pass: avoid one source dominating the list.
  const balanced: NewsArticle[] = [];
  const perSource = new Map<string, number>();

  for (const article of deduped) {
    const count = perSource.get(article.source) ?? 0;
    if (count >= SOURCE_DIVERSITY_LIMIT) {
      continue;
    }

    balanced.push(article);
    perSource.set(article.source, count + 1);

    if (balanced.length >= MAX_ARTICLES) {
      return balanced;
    }
  }

  if (balanced.length >= MAX_ARTICLES) {
    return balanced;
  }

  for (const article of deduped) {
    if (balanced.some((existing) => existing.url === article.url)) {
      continue;
    }

    balanced.push(article);
    if (balanced.length >= MAX_ARTICLES) {
      break;
    }
  }

  return balanced;
}

async function fetchHeadlinesForQuery(
  query: string,
  apiKey: string,
  fromIso?: string,
) {
  const url = new URL(NEWS_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(QUERY_PAGE_SIZE));
  if (fromIso) {
    url.searchParams.set("from", fromIso);
  }

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `NewsAPI request failed with ${response.status} ${response.statusText} for query "${query}".`,
    );
  }

  const payload = (await response.json()) as NewsApiResponse;

  if (payload.status !== "ok" || !payload.articles) {
    throw new Error(payload.message ?? "NewsAPI returned an invalid response.");
  }

  return payload.articles.map(toNewsArticle).filter((article): article is NewsArticle => article !== null);
}

export async function fetchTopAiHeadlines(): Promise<NewsArticle[]> {
  const apiKey = getRequiredServerEnv("NEWS_API_KEY");
  let collected: NewsArticle[] = [];
  const rejectionMessages: string[] = [];

  for (const lookbackHours of LOOKBACK_WINDOWS_HOURS) {
    const fromIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
    const batchedResults = await Promise.allSettled(
      NEWS_QUERIES.map((query) => fetchHeadlinesForQuery(query, apiKey, fromIso)),
    );
    const fulfilled = batchedResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<NewsArticle[]> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value)
      .flat();
    const rejected = batchedResults.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    collected = dedupeAndRankArticles([...collected, ...fulfilled]);
    rejectionMessages.push(
      ...rejected.map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      ),
    );

    if (collected.length >= MIN_ARTICLES) {
      return collected;
    }
  }

  const fallbackResults = await Promise.allSettled([
    fetchHeadlinesForQuery(BROAD_FALLBACK_QUERY, apiKey),
  ]);
  const fallbackArticles = fallbackResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<NewsArticle[]> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .flat();
  rejectionMessages.push(
    ...fallbackResults
      .filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      )
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      ),
  );

  const articles = dedupeAndRankArticles([...collected, ...fallbackArticles]);

  if (articles.length === 0) {
    const rejectionReason =
      rejectionMessages.length > 0
        ? ` Query errors: ${rejectionMessages.join(" | ")}`
        : "";
    throw new Error(
      `No valid AI headlines were returned by NewsAPI.${rejectionReason}`,
    );
  }

  return articles;
}
