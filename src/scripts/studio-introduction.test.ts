import assert from "node:assert/strict";
import test from "node:test";
import type { PortableTextBlock } from "@portabletext/types";
import { studioIntroduction } from "../lib/studioIntroduction.ts";

const text = (copy: string, style = "normal") => ({
  _type: "textBlock",
  content: [{ _type: "block", style, children: [{ _type: "span", text: copy, marks: [] }], markDefs: [] }] as PortableTextBlock[],
});
const image = { _type: "imageBlock", images: [{ asset: { url: "/photo.jpg" } }] };

test("leading text moves to the summary once, while later text stays in CMS order beside media", () => {
  const intro = text("Our studio"), second = text("More about the studio"), later = text("Image description");
  const result = studioIntroduction([intro, second, image, later], "Profile");
  assert.deepEqual(result.introduction, [intro, second]);
  assert.deepEqual(result.body, [image, later]);
  assert.deepEqual([...result.introduction, ...result.body], [intro, second, image, later]);
  assert.equal(result.startIndex, 2);
});

test("media-first sections do not pull subsequent text ahead of photographs", () => {
  const later = text("This follows the photograph");
  const result = studioIntroduction([image, later], "Values");
  assert.deepEqual(result.introduction, []);
  assert.deepEqual(result.body, [image, later]);
  assert.equal(result.startIndex, 0);
});

test("empty blocks do not hide a real intro and removing an odd prefix preserves body alignment parity", () => {
  const intro = text("Introduction");
  const result = studioIntroduction([{ _type: "unfinished" }, text(" "), intro, image], "Awards");
  assert.deepEqual(result.introduction, [intro]);
  assert.deepEqual(result.body, [image]);
  assert.equal(result.startIndex % 2, 1);
});

test("repeated tab headings are omitted without changing CMS content or body alignment", () => {
  const heading = text(" People ", "h2"), intro = text("Meet our team");
  const original = structuredClone(heading);
  const result = studioIntroduction([heading, intro, image], "People");
  assert.deepEqual(result.introduction, [intro]);
  assert.deepEqual(result.body, [image]);
  assert.equal(result.startIndex, 2);
  assert.deepEqual(heading, original);

  const combined = { ...heading, content: [...heading.content, ...intro.content] };
  assert.deepEqual(studioIntroduction([combined], "People").introduction, [intro]);
  assert.deepEqual(studioIntroduction([heading], "People").introduction, []);
});

test("ordinary text and editorial headings that differ from the tab label remain visible", () => {
  const paragraph = text("People"), heading = text("Our approach", "h2");
  assert.deepEqual(studioIntroduction([paragraph], "People").introduction, [paragraph]);
  assert.deepEqual(studioIntroduction([heading], "Values").introduction, [heading]);
});

test("absent and text-only sections remain valid without placeholder media or lost text", () => {
  assert.deepEqual(studioIntroduction(undefined, "Profile").body, []);
  const intro = text("People intro");
  const result = studioIntroduction([intro], "People");
  assert.deepEqual(result.introduction, [intro]);
  assert.deepEqual(result.body, []);
});
