import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Several projects share this machine and there is a lockfile above this one,
  // so Next infers the wrong workspace root and traces the wrong files.
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    // The v1 curriculum, quiz and news sections are retired. Redirect rather
    // than 404 so existing links and search results still land somewhere useful.
    return [
      { source: "/curriculum", destination: "/learn", permanent: true },
      { source: "/curriculum/:path*", destination: "/learn", permanent: true },
      { source: "/practice", destination: "/problems", permanent: true },
      { source: "/quiz", destination: "/learn", permanent: true },
      { source: "/quiz/:path*", destination: "/learn", permanent: true },
      { source: "/signal", destination: "/learn", permanent: true },
      { source: "/signal/:path*", destination: "/learn", permanent: true },
      { source: "/news", destination: "/learn", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Pinned, content-addressed wasm runtimes. Immutable so a learner
        // downloads Pyodide/DuckDB once, not once per lesson.
        source: "/runtime/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Dataset files are content-addressed, so they can be cached forever.
        source: "/assets/datasets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // The search index is rebuilt on every deploy and keeps its filename,
        // so it must revalidate — caching it immutably would pin a learner to a
        // stale index for a year.
        source: "/assets/search-index.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
