import assert from "node:assert/strict";
import test from "node:test";
import { gallerySlide, gallerySlides } from "../lib/gallery.ts";
import { isRenderable } from "../lib/contentBlocks.ts";
import { findFirstImageUrl } from "../lib/seo.ts";
import { galleryScrollTarget } from "./gallery-navigation.ts";
import type { GalleryImage } from "../types/Gallery.ts";

const image = (width = 4000, height = 3000): GalleryImage => ({
  asset: { url: "https://cdn.sanity.io/images/test/production/photo.jpg", metadata: { dimensions: { width, height } } },
  altText: "Courtyard and entrance",
});

test("gallery images retain landscape and portrait proportions and cap the lightbox's longest edge", () => {
  for (const [width, height] of [[4000, 3000], [3000, 4500], [9000, 1000], [200, 300]]) {
    const slide = gallerySlide(image(width, height))!;
    assert.equal(slide.width, width);
    assert.equal(slide.height, height);
    assert.ok(slide.lightboxWidth <= width && slide.lightboxHeight <= height);
    assert.ok(Math.max(slide.lightboxWidth, slide.lightboxHeight) <= 2560);
    assert.ok(Math.abs(slide.lightboxHeight - slide.lightboxWidth * height / width) <= 0.5);
    const url = new URL(slide.lightbox);
    assert.equal(url.searchParams.get("w"), String(slide.lightboxWidth));
    assert.equal(url.searchParams.get("fit"), "max");
    assert.equal(url.searchParams.get("auto"), "format");
    assert.equal(url.searchParams.has("h"), false);
    assert.equal(url.searchParams.has("crop"), false);
  }
});

test("explicit editorial crops are shared by thumbnails and the lightbox, with cropped dimensions", () => {
  const slide = gallerySlide({ ...image(), crop: { left: 0.1, right: 0.2, top: 0.1, bottom: 0.1 } })!;
  assert.equal(slide.width, 2800);
  assert.equal(slide.height, 2400);
  assert.equal(new URL(slide.thumbnail).searchParams.get("rect"), "400,300,2800,2400");
  assert.equal(new URL(slide.lightbox).searchParams.get("rect"), "400,300,2800,2400");
  assert.equal(slide.lightboxHeight, Math.round(2400 * slide.lightboxWidth / 2800));
});

test("hotspots do not impose an aspect crop and malformed crop values are ignored", () => {
  for (const crop of [{ left: 0.9, right: 0.9 }, { top: NaN }, { bottom: -1 }]) {
    const slide = gallerySlide({ ...image(), crop, hotspot: { x: 0.2, y: 0.7 } })!;
    assert.equal(slide.width, 4000);
    assert.equal(slide.height, 3000);
    assert.equal(new URL(slide.lightbox).searchParams.has("rect"), false);
  }
});

test("responsive URLs never upscale small sources and contain accurate width descriptors", () => {
  const slide = gallerySlide(image(350, 700))!;
  assert.equal(slide.lightboxWidth, 350);
  assert.equal(slide.lightboxHeight, 700);
  for (const set of [slide.srcset, slide.lightboxSrcset]) {
    const widths = set.split(", ").map((entry) => {
      const [url, descriptor] = entry.split(" ");
      const width = Number(new URL(url).searchParams.get("w"));
      assert.equal(descriptor, `${width}w`);
      assert.ok(width <= 350);
      return width;
    });
    assert.deepEqual(widths, [240, 350]);
  }
});

test("empty or malformed images are skipped safely, preserving valid image order and text", () => {
  assert.deepEqual(gallerySlides(null), []);
  assert.deepEqual(gallerySlides({ images: [] }), []);
  assert.deepEqual(gallerySlides([null, {}, image(0, 10), image(NaN, 10), image(10, Infinity)]), []);
  assert.equal(gallerySlide({ ...image(), asset: { ...image().asset, url: "javascript:alert(1)" } }), undefined);
  const slides = gallerySlides([null, { ...image(), altText: "  First  " }, {}, { ...image(600, 900), altText: "Second", caption: "<b>Plain text</b>" }]);
  assert.deepEqual(slides.map((slide) => slide.alt), ["First", "Second"]);
  assert.equal(slides[1].caption, "<b>Plain text</b>");
  assert.equal(gallerySlide({ ...image(), altText: null, caption: "An entrance" })?.alt, "An entrance");
});

test("mixed content order and legacy renderability remain intact; incomplete galleries disappear", () => {
  const blocks = [
    { _type: "textBlock", content: [{ children: [{ text: "Introduction" }] }] },
    { _type: "imageBlock", images: [{ asset: { url: "legacy.jpg" } }] },
    { _type: "galleryBlock", images: [image()] },
    { _type: "textBlock", content: [{ children: [{ text: "More text" }] }] },
    { _type: "galleryBlock", images: [image(100, 200)] },
  ];
  assert.deepEqual(blocks.filter(isRenderable), blocks);
  for (const block of [null, {}, { _type: "galleryBlock" }, { _type: "galleryBlock", images: [null, {}] }, { _type: "textBlock", content: [{ children: [{ text: " " }] }] }]) {
    assert.equal(isRenderable(block), false);
  }
});

test("gallery-only Insights can use their first photograph for the SEO image fallback", () => {
  assert.equal(findFirstImageUrl([{ _type: "galleryBlock", images: [image()] }]), image().asset!.url);
  assert.equal(findFirstImageUrl([{ _type: "imageBlock", images: [{ asset: { url: "legacy.jpg" } }] }]), "legacy.jpg");
});

test("carousel navigation uses variable slide starts and clamps the final partially visible slide", () => {
  const starts = [0, 210, 850, 1100];
  assert.equal(galleryScrollTarget(starts, 0, 1000, 1), 210);
  assert.equal(galleryScrollTarget(starts, 210, 1000, 1), 850);
  assert.equal(galleryScrollTarget(starts, 850, 1000, 1), 1000);
  assert.equal(galleryScrollTarget(starts, 1000, 1000, 1), 1000);
  assert.equal(galleryScrollTarget(starts, 1000, 1000, -1), 850);
  assert.equal(galleryScrollTarget(starts, 209.5, 1000, -1), 0);
  assert.equal(galleryScrollTarget(starts, -5, 1000, -1), 0);
  assert.equal(galleryScrollTarget([0], 0, 0, 1), 0);
});
