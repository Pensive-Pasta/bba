import assert from "node:assert/strict";
import test from "node:test";
import type { PortableTextBlock } from "@portabletext/types";
import { projectIntroduction } from "../lib/projectIntroduction.ts";

const text = (key: string, copy: string, style = "normal") => ({
  _type: "textBlock", _key: key,
  content: [{ _type: "block", style, markDefs: [], children: [{ _type: "span", text: copy, marks: [] }] }] as PortableTextBlock[],
});
const image = { _type: "imageBlock", _key: "image", images: [{ asset: { url: "/existing-image.jpg" } }] };
const gallery = {
  _type: "galleryBlock", _key: "gallery", presentation: "editorial",
  images: [{ asset: { url: "https://cdn.sanity.io/images/9s2ar5mb/production/photo-2000x1000.jpg", metadata: { dimensions: { width: 2000, height: 1000 } } } }],
};

test("the existing introduction and its headings move once while the gallery retains every field", () => {
  const heading = text("heading", "Existing introduction heading", "h2");
  const paragraph = text("intro", "Existing project introduction");
  const blocks = [heading, paragraph, gallery];
  const original = structuredClone(blocks);
  const result = projectIntroduction(blocks);
  assert.deepEqual(result.introduction, [heading, paragraph]);
  assert.deepEqual(result.body, [gallery]);
  assert.deepEqual([...result.introduction, ...result.body], blocks);
  assert.deepEqual(blocks, original);
});

test("text after photographs stays in the editorial sequence rather than moving into the introduction", () => {
  const intro = text("intro", "First paragraph"), later = text("later", "Associated image text");
  const result = projectIntroduction([intro, image, later, gallery]);
  assert.deepEqual(result.introduction, [intro]);
  assert.deepEqual(result.body, [image, later, gallery]);
  assert.equal(result.startIndex, 1);
});

test("remaining legacy image alignment keeps its original odd/even position", () => {
  const intro = text("intro", "Existing introduction");
  const result = projectIntroduction([text("blank", " "), intro, image]);
  assert.equal(result.startIndex, 1);
  assert.equal((result.startIndex + result.body.indexOf(image)) % 2, 1);
});

test("media-first projects keep their existing order without fabricated introductory copy", () => {
  const later = text("later", "Text after the image");
  const result = projectIntroduction([image, later]);
  assert.deepEqual(result.introduction, []);
  assert.deepEqual(result.body, [image, later]);
  assert.equal(result.startIndex, 0);
});

test("missing and text-only project content does not create an empty editorial section", () => {
  assert.deepEqual(projectIntroduction(undefined), { introduction: [], body: [], startIndex: 0 });
  assert.deepEqual(projectIntroduction(null), { introduction: [], body: [], startIndex: 0 });
  const intro = text("intro", "Project with no gallery");
  const result = projectIntroduction([intro]);
  assert.deepEqual(result.introduction, [intro]);
  assert.deepEqual(result.body, []);
});
