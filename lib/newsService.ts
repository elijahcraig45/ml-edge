import "server-only";

import { getRequiredServerEnv } from "@/lib/env";
import { curateNewsArticles, normalizeNewsUrl } from "@/lib/news-article-quality";
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
const MIN_ARTICLES = 6;
const LOOKBACK_WINDOWS_HOURS = [24, 72];

const NEWS_QUERIES = [
  '"artificial intelligence" OR "machine learning" OR "large language model" OR AI',
  "OpenAI OR Anthropic OR DeepMind OR Meta AI OR Mistral AI",
  "PyTorch OR TensorFlow OR JAX OR CUDA OR model quantization OR inference OR serving",
];
const BROAD_FALLBACK_QUERY = "AI OR machine learning";

type RawNewsArticle = NonNullable<NewsApiResponse["articles"]>[number];

function toNewsArticle(article: RawNewsArticle): NewsArticle | null {
  if (!article.title || !article.url) {
    return null;
  }

  return {
    title: article.title,
    description: article.description ?? "",
    url: normalizeNewsUrl(article.url),
    source: article.source?.name ?? "Unknown Source",
    publishedAt: article.publishedAt ?? new Date().toISOString(),
  };
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

    collected = curateNewsArticles([...collected, ...fulfilled]);
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

  const articles = curateNewsArticles([...collected, ...fallbackArticles]);

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
