type Environment = Record<string, string | boolean | undefined>;

// The deployment context, never Vite's production build mode or a leftover
// staging flag, decides indexing. Netlify preview/branch contexts always win.
export function resolveDeployment(env: Environment) {
  const context = String(env.NETLIFY_PREVIEW_SERVER ? "preview-server" : env.CONTEXT || env.BBA_DEPLOYMENT_ENV || "development");
  const configured = String(env.PUBLIC_PRODUCTION_SITE_URL || env.PUBLIC_SITE_URL || "").trim();
  if (!configured) throw new Error("Set PUBLIC_PRODUCTION_SITE_URL to the confirmed public domain (PUBLIC_SITE_URL remains a legacy fallback).");
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    /(^|\.)(localhost|netlify\.app|vercel\.app|pages\.dev)$/.test(url.hostname) || /(^|[.-])(staging|preview|deploy-preview)([.-]|$)/.test(url.hostname)) {
    throw new Error("The canonical site URL must be the HTTPS production origin, not a staging/preview URL.");
  }
  if (context === "production" && env.URL && new URL(String(env.URL)).origin !== url.origin) {
    throw new Error("The production hosting URL disagrees with the canonical origin. Confirm the production domain/context instead of indexing a staging host.");
  }
  return { siteOrigin: url.origin, allowIndexing: context === "production", context };
}

export function pageRobots(allowIndexing: boolean, requested?: string) {
  if (!allowIndexing) return requested?.includes("nofollow") ? "noindex,nofollow" : "noindex,follow";
  return requested || "index,follow,max-image-preview:large";
}

export function canonicalUrl(path: string, origin: string) {
  const url = new URL(path, origin);
  url.search = "";
  url.hash = "";
  if (!/\.[a-z0-9]+$/i.test(url.pathname)) url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url.toString();
}

export function isSitemapPage(page: string) {
  const path = new URL(page).pathname.replace(/\/$/, "") || "/";
  return ["/", "/work", "/studio", "/insights", "/contact", "/process", "/legal"].includes(path) ||
    /^\/(work|insights)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path);
}
