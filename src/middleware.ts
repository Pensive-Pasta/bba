import { defineMiddleware } from "astro:middleware";

const passthroughPrefixes = [
  "/_astro/",
  "/@",
  "/src/",
  "/node_modules/",
  "/images/",
  "/icons/",
  "/logos/",
  "/scripts/",
  "/videos/",
];

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  const isHoldingFallback =
    pathname === "/404" || pathname === "/404/" || pathname === "/404.html";
  const isAsset =
    pathname !== "/" &&
    (pathname.split("/").at(-1)?.includes(".") ||
      passthroughPrefixes.some((prefix) => pathname.startsWith(prefix)));

  if (pathname !== "/" && !isHoldingFallback && !isAsset) {
    return context.redirect("/", 302);
  }

  return next();
});
