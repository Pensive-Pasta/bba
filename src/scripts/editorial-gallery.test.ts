import assert from "node:assert/strict";
import test from "node:test";
import { editorialArrangements } from "../lib/editorialGallery.ts";
import { gallerySlides } from "../lib/gallery.ts";
import { isRenderable } from "../lib/contentBlocks.ts";
import type { GalleryImage } from "../types/Gallery.ts";

const image = (name: string, width = 3000, height = 2000, editorialLayout: GalleryImage["editorialLayout"] = "auto"): GalleryImage => ({
  _key: name,
  altText: `Alt ${name}`,
  editorialLayout,
  asset: { url: `https://cdn.sanity.io/images/project/production/${name}.jpg`, metadata: { dimensions: { width, height } } },
});
const names = (groups: ReturnType<typeof editorialArrangements>) => groups.flatMap((group) => group.slides.map((slide) => slide.alt));

test("full opening image then portrait left and two stacked landscapes retain a single complete sequence", () => {
  const images = [image("exterior", 5472, 3648, "full"), image("seat", 3648, 5472, "portrait-stack"), image("kitchen"), image("joinery"), image("drawing"), image("section", 592, 275, "half"), image("desk", 4119, 5373), image("detail", 384, 522), image("roof", 384, 383)];
  const groups = editorialArrangements(images);
  assert.deepEqual(groups.map((group) => [group.layout, group.slides.length]), [["full", 1], ["portrait-stack", 3], ["columns", 2], ["columns", 2], ["columns", 1]]);
  assert.deepEqual(names(groups), images.map((image) => image.altText));
  assert.equal(new Set(names(groups)).size, images.length);
  assert.deepEqual(groups.flatMap((group) => group.slides), gallerySlides(images));
  assert.equal(groups[1].slides[0].width / groups[1].slides[0].height, 2 / 3);
});

test("automatic wide images start full-width arrangements; half-width overrides preserve adjacent pairs", () => {
  const wide = image("wide", 4000, 1500);
  assert.deepEqual(editorialArrangements([image("portrait", 1000, 1500), wide]).map((group) => group.layout), ["columns", "full"]);
  assert.deepEqual(editorialArrangements([image("portrait", 1000, 1500), { ...wide, editorialLayout: "half" }]).map((group) => group.layout), ["columns"]);
});

test("unfinished or conflicting portrait arrangements fall back without losing or reordering images", () => {
  for (const images of [
    [image("portrait", 1000, 1500, "portrait-stack")],
    [image("portrait", 1000, 1500, "portrait-stack"), image("one")],
    [image("portrait", 1000, 1500, "portrait-stack"), image("full", 3000, 2000, "full"), image("last")],
  ]) assert.deepEqual(names(editorialArrangements(images)), images.map((image) => image.altText));
  assert.deepEqual(editorialArrangements([null, { asset: { url: "bad" } }]), []);
  assert.deepEqual(editorialArrangements(undefined), []);
});

test("editorial mode preserves captions, alt text and chosen crop through the existing lightbox image pipeline", () => {
  const source = { ...image("captioned"), caption: "Optional caption", crop: { left: .1, right: .1, top: 0, bottom: 0 } };
  const slide = editorialArrangements([source])[0].slides[0];
  assert.equal(slide.alt, source.altText);
  assert.equal(slide.caption, source.caption);
  assert.equal(slide.width, 2400);
  assert.equal(slide.height, 2000);
  assert.equal(new URL(slide.lightbox).searchParams.get("rect"), "300,0,2400,2000");
  assert.equal(new URL(slide.lightbox).searchParams.get("h"), null);
  assert.equal(editorialArrangements([image("uncaptioned")])[0].slides[0].caption, "");
  assert.equal(isRenderable({ _type: "galleryBlock", presentation: "editorial", images: [source] }), true);
  assert.equal(isRenderable({ _type: "galleryBlock", images: [source] }), true);
});
