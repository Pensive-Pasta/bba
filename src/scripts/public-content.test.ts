import assert from "node:assert/strict";
import test from "node:test";
import { hasPublishedEditorial, isPublicInsight } from "../lib/publicContent.ts";
import { projectDetailHref } from "../lib/projects.ts";

const article = { _id: "article", title: "An article", slug: { current: "an-article" }, publishedAt: "2025-01-01T12:00:00Z", contentText: "Real published editorial content." };
test("published Insights remain public regardless of their copy or display date", () => {
  assert.equal(isPublicInsight(article), true);
  for (const change of [
    { contentText: "Lorem ipsum dolor sit amet" }, { contentText: "Coming soon." }, { contentText: " " },
    { contentText: undefined }, { publishedAt: "2030-01-01" }, { publishedAt: undefined }, { title: "" },
  ]) assert.equal(isPublicInsight({...article, ...change}), true);
});

test("Insight guards still reject drafts and invalid or missing route slugs", () => {
  assert.equal(isPublicInsight(null), false);
  for (const change of [{ _id: "drafts.article" }, { slug: { current: "../article" } }, { slug: undefined }]) {
    assert.equal(isPublicInsight({...article, ...change}), false);
  }
  assert.equal(hasPublishedEditorial("An article about buildings under construction."), true);
});

test("an enabled project with placeholder editorial text still cannot generate a link", () => {
  assert.equal(projectDetailHref({title: "Unfinished", postCode: "PE8", slug: {current: "unfinished"}, caseStudyEnabled: true, caseStudyText: "Lorem ipsum dolor sit amet", imageUrl: "https://example.com/photo.jpg"}), undefined);
});
