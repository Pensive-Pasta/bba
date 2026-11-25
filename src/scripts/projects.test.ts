import assert from "node:assert/strict";
import test from "node:test";
import { homeProjectTiles, projectDetailHref, workGridProjects } from "../lib/projects.ts";
import type { Project } from "../types/Project";

const caseStudy: Project = {
  _id: "existing", title: "Existing project", postCode: "PE8", slug: { current: "existing-project" },
  caseStudyEnabled: true, caseStudyText: "Project editorial", imageUrl: "https://example.com/hero.jpg",
};

test("only enabled, published, complete case studies have detail links", () => {
  assert.equal(projectDetailHref(caseStudy), "/work/existing-project");
  for (const change of [
    { caseStudyEnabled: false }, { caseStudyEnabled: undefined }, { caseStudyText: " \n " },
    { slug: undefined }, { slug: { current: "../bad/path" } }, { imageUrl: undefined }, { _id: "drafts.existing" },
  ]) assert.equal(projectDetailHref({ ...caseStudy, ...change }), undefined);
  assert.equal(projectDetailHref({ ...caseStudy, imageUrl: undefined, heroVideo: { url: "https://example.com/hero.mp4" } }), "/work/existing-project");
});

test("grid selection preserves editorial order while excluding duplicates and unready references", () => {
  const second = { ...caseStudy, _id: "second", title: "Second" };
  assert.deepEqual(workGridProjects([second, null, { ...caseStudy, caseStudyEnabled: false }, caseStudy, second]), [second, caseStudy]);
  assert.deepEqual(workGridProjects([{ ...caseStudy, imageUrl: undefined, heroVideo: { url: "https://example.com/hero.mp4" } }]), []);
});

test("homepage keeps explicit white tiles white and never invents an ambiguous project", () => {
  const result = homeProjectTiles([
    { display: "postcode", label: "M28" },
    { display: "media", project: caseStudy },
    { display: "postcode", project: caseStudy },
  ]);
  assert.deepEqual(result.map(({ label, media }) => ({ label, media })), [
    { label: "M28", media: false }, { label: "PE8", media: true },
    { label: "PE8", media: false }, { label: "", media: false },
  ]);
  assert.equal(result[0].project, undefined);
  assert.equal(homeProjectTiles([{ display: "media", project: null }])[0].media, false);
});
