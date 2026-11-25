import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => new Response([
  "User-agent: *",
  // Let crawlers read the noindex meta on staging. Disallowing crawl would
  // prevent them seeing it; staging does not advertise a sitemap.
  "Allow: /",
  ...(import.meta.env.BBA_INDEXING_ENABLED ? [`Sitemap: ${new URL("/sitemap-index.xml", site).toString()}`] : []),
  "",
].join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
