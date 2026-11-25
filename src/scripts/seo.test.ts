import assert from "node:assert/strict";
import test from "node:test";
import { canonicalUrl, isSitemapPage, pageRobots, resolveDeployment } from "../lib/deployment.ts";
import { excerpt, portableTextToPlainText, resolveSeoDescription, resolveSeoTitle, resolveSeoImage, safeJsonLd } from "../lib/seo.ts";

const origin = "https://architecture.example";
test("production indexing ignores an inherited staging flag while preview contexts cannot opt in", () => {
  assert.equal(resolveDeployment({ PUBLIC_SITE_URL: origin, CONTEXT: "production", PUBLIC_ALLOW_INDEXING: "false" }).allowIndexing, true);
  for (const context of ["deploy-preview", "branch-deploy", "preview-server", "development", "staging"]) {
    assert.equal(resolveDeployment({ PUBLIC_PRODUCTION_SITE_URL: origin, CONTEXT: context, BBA_DEPLOYMENT_ENV: "production", PUBLIC_ALLOW_INDEXING: "true" }).allowIndexing, false);
  }
  assert.equal(resolveDeployment({ PUBLIC_SITE_URL: origin }).allowIndexing, false);
  assert.equal(resolveDeployment({ PUBLIC_SITE_URL: origin, CONTEXT: "production", NETLIFY_PREVIEW_SERVER: "true" }).allowIndexing, false);
  assert.equal(resolveDeployment({ PUBLIC_SITE_URL: origin, BBA_DEPLOYMENT_ENV: "production" }).allowIndexing, true);
  assert.equal(pageRobots(false, "index,follow"), "noindex,follow");
  assert.equal(pageRobots(true, "noindex,nofollow"), "noindex,nofollow");
});

test("canonical origin is explicit and rejects staging hosts and conflicting production hosting", () => {
  assert.throws(() => resolveDeployment({}));
  for (const url of ["http://architecture.example", "https://preview.architecture.example", "https://demo.netlify.app", `${origin}/work/`]) {
    assert.throws(() => resolveDeployment({ PUBLIC_SITE_URL: url }));
  }
  assert.equal(resolveDeployment({ PUBLIC_PRODUCTION_SITE_URL: origin, PUBLIC_SITE_URL: "https://staging.example" }).siteOrigin, origin);
  assert.throws(() => resolveDeployment({ PUBLIC_SITE_URL: origin, CONTEXT: "production", URL: "https://staging.example" }));
  assert.equal(canonicalUrl("/work/copper-house?filter=urban#gallery", origin), `${origin}/work/copper-house/`);
});

test("sitemap excludes utility pages and cannot invent index-only project routes", () => {
  for (const path of ["/", "/work/", "/studio/", "/insights/article/", "/work/enabled-case-study/"]) assert.equal(isSitemapPage(new URL(path, origin).toString()), true);
  for (const path of ["/404.html", "/404/", "/initial-project-brief/", "/robots.txt", "/work/bad.path/"]) assert.equal(isSitemapPage(new URL(path, origin).toString()), false);
});

test("manual metadata is preserved and portable text marks do not add spaces inside words", () => {
  assert.equal(resolveSeoDescription("Approved manual description", "Different fallback"), "Approved manual description");
  assert.equal(resolveSeoTitle("Approved title", "Other title"), "Approved title");
  assert.equal(resolveSeoTitle(" ", "Project title | BBA"), "Project title | BBA");
  assert.equal(portableTextToPlainText([{ _type: "block", children: [{ text: "Tim" }, { text: "ber extension" }] }]), "Timber extension");
  assert.ok((excerpt("A long, naturally written description. ".repeat(10))?.length || 0) <= 160);
  const dangerous = { text: '</script><script>alert("x")</script>' };
  assert.equal(safeJsonLd(dangerous).includes("</script>"), false);
  assert.deepEqual(JSON.parse(safeJsonLd(dangerous)), dangerous);
});

test("social image transformations retain a selected crop and focal point", () => {
  const url = new URL(resolveSeoImage({asset: {url: "https://cdn.sanity.io/images/project/production/photo.jpg", metadata: {dimensions: {width: 1000, height: 1000}}}, crop: {left: .1, right: .1, top: 0, bottom: 0}, hotspot: {x: .5, y: .3}}));
  assert.equal(url.searchParams.get("rect"), "100,0,800,1000");
  assert.equal(url.searchParams.get("fp-y"), "0.3");
  assert.equal(url.searchParams.get("w"), "1200");
  assert.equal(resolveSeoImage("/images/logo-og.jpg"), "/images/logo-og.jpg");
});
