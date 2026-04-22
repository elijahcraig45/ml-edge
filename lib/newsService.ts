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

export async function fetchTopAiHeadlines(): Promise<NewsArticle[]> {
  const apiKey = getRequiredServerEnv("NEWS_API_KEY");
  const url = new URL("https://newsapi.org/v2/everything");

  url.searchParams.set("q", '"artificial intelligence" OR "machine learning"');
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "5");

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `NewsAPI request failed with ${response.status} ${response.statusText}.`,
    );
  }

  const payload = (await response.json()) as NewsApiResponse;

  if (payload.status !== "ok" || !payload.articles) {
    throw new Error(payload.message ?? "NewsAPI returned an invalid response.");
  }

  return payload.articles
    .filter((article) => article.title && article.url)
    .map((article) => ({
      title: article.title ?? "Untitled AI headline",
      description: article.description ?? "",
      url: article.url ?? "#",
      source: article.source?.name ?? "Unknown Source",
      publishedAt: article.publishedAt ?? new Date().toISOString(),
    }));
}
