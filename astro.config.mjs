import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";
import { resolveDeployment, isSitemapPage } from "./src/lib/deployment.ts";

const deployment = resolveDeployment({ ...loadEnv(process.env.NODE_ENV || "production", process.cwd(), ""), ...process.env });

export default defineConfig({
  site: deployment.siteOrigin,
  vite: { define: { "import.meta.env.BBA_INDEXING_ENABLED": JSON.stringify(deployment.allowIndexing) } },
  integrations: deployment.allowIndexing ? [sitemap({ filter: isSitemapPage })] : [],
});
