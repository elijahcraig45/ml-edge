import type { NewsArticle } from "@/lib/types";

const MAX_ARTICLES = 12;
const SOURCE_DIVERSITY_LIMIT = 2;
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
  "observability",
  "orchestration",
];

const NOISE_TERMS = [
  "election",
  "voters",
  "cricket",
  "football",
  "sport",
  "sports",
  "celebrity",
  "gossip",
  "stock market",
  "wall street",
  "dow jones",
];

const BLOCKED_HOSTS = new Set([
  "pypi.org",
  "www.pypi.org",
  "npmjs.com",
  "www.npmjs.com",
  "rubygems.org",
  "www.rubygems.org",
  "crates.io",
  "www.crates.io",
  "play.google.com",
  "apps.apple.com",
]);

const BLOCKED_PATH_TERMS = ["/sport/", "/sports/"];

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s*[-|]\s*(reuters|ap news|associated press|bloomberg).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTerm(text: string, term: string) {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function countMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => (matchesTerm(text, term) ? count + 1 : count), 0);
}

function getParsedUrl(rawUrl: string) {
  if (!URL.canParse(rawUrl)) {
    return null;
  }

  return new URL(rawUrl);
}

function isBlockedArticle(article: NewsArticle) {
  const parsed = getParsedUrl(article.url);

  if (!parsed) {
    return false;
  }

  if (BLOCKED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return true;
  }

  const normalizedPath = parsed.pathname.toLowerCase();

  return BLOCKED_PATH_TERMS.some((term) => normalizedPath.includes(term));
}

function getArticleSignalScore(article: NewsArticle) {
  const title = article.title.toLowerCase();
  const description = article.description.toLowerCase();
  const combined = `${title} ${description} ${article.source.toLowerCase()}`;
  const titleSignals = countMatches(title, TECH_SIGNAL_TERMS);
  const combinedSignals = countMatches(combined, TECH_SIGNAL_TERMS);
  const noiseMatches = countMatches(combined, NOISE_TERMS);

  return titleSignals * 3 + combinedSignals - noiseMatches * 4;
}

function choosePreferredArticle(current: NewsArticle, candidate: NewsArticle) {
  const currentScore = getArticleSignalScore(current);
  const candidateScore = getArticleSignalScore(candidate);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

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

export function normalizeNewsUrl(rawUrl: string) {
  const parsed = getParsedUrl(rawUrl);

  if (!parsed) {
    return rawUrl;
  }

  parsed.hash = "";

  Array.from(parsed.searchParams.keys()).forEach((key) => {
    if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
    }
  });

  if (parsed.searchParams.size === 0) {
    parsed.search = "";
  }

  return parsed.toString();
}

export function isEligibleNewsArticle(article: NewsArticle) {
  if (isBlockedArticle(article)) {
    return false;
  }

  return getArticleSignalScore(article) >= 2;
}

export function curateNewsArticles(articles: NewsArticle[]) {
  const eligible = articles.filter(isEligibleNewsArticle);
  const byKey = new Map<string, NewsArticle>();

  for (const article of eligible) {
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
    const scoreDelta = getArticleSignalScore(right) - getArticleSignalScore(left);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const leftDate = Date.parse(left.publishedAt);
    const rightDate = Date.parse(right.publishedAt);
    return (Number.isFinite(rightDate) ? rightDate : 0) - (Number.isFinite(leftDate) ? leftDate : 0);
  });

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

  return balanced;
}
