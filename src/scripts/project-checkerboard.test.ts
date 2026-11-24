import assert from "node:assert/strict";
import test from "node:test";
import { projectCheckerboard } from "../lib/projectCheckerboard.ts";

const image = (id: string, type = "urban") => ({ id, type, imageUrl: `https://example.com/${id}.jpg` });
const white = (id: string, type = "urban") => ({ id, type, imageUrl: undefined });
const collection = (images: number, whites: number) => [
  ...Array.from({ length: images }, (_, i) => image(`i${i + 1}`)),
  ...Array.from({ length: whites }, (_, i) => white(`w${i + 1}`)),
];
const ids = (projects: { id: string }[]) => projects.map((project) => project.id).join(" ");

test("four columns alternate row starts to produce diagonal white squares", () => {
  assert.equal(ids(projectCheckerboard(collection(8, 8), 4)),
    "w1 i1 w2 i2 i3 w3 i4 w4 w5 i5 w6 i6 i7 w7 i8 w8");
});

test("two columns use white/image then image/white rows", () => {
  assert.equal(ids(projectCheckerboard(collection(4, 4), 2)), "w1 i1 i2 w2 w3 i3 i4 w4");
});

test("one column simply alternates white and image", () => {
  assert.equal(ids(projectCheckerboard(collection(3, 3), 1)), "w1 i1 w2 i2 w3 i3");
});

test("unequal groups append the remaining projects without blanks or repeated projects", () => {
  for (const columns of [1, 2, 4]) {
    assert.equal(ids(projectCheckerboard(collection(5, 1), columns)), "w1 i1 i2 i3 i4 i5");
    assert.equal(ids(projectCheckerboard(collection(1, 5), columns)), "w1 i1 w2 w3 w4 w5");
  }
});

test("image-only, white-only and empty collections retain their input order", () => {
  for (const columns of [1, 2, 4]) {
    for (const input of [collection(5, 0), collection(0, 5), collection(0, 0)]) {
      assert.deepEqual(projectCheckerboard(input, columns), input);
    }
  }
});

test("hero assets and the existing image URL fallback count as images; video alone does not", () => {
  const hero = { id: "hero", heroImage: { asset: { url: "https://example.com/hero.jpg" } } };
  const fallback = image("fallback");
  const video = { id: "video", heroVideo: { url: "https://example.com/video.mp4" }, imageUrl: undefined };
  const emptyAsset = { id: "empty", heroImage: { asset: null } };
  assert.equal(ids(projectCheckerboard([hero, fallback, video, emptyAsset], 4)), "video hero empty fallback");
});

test("ordering is deterministic, does not mutate input, and keeps relative order within both groups", () => {
  const input = Object.freeze([white("w3"), image("i2"), white("w1"), image("i1"), image("i3"), white("w2")].map((project) => Object.freeze(project)));
  const before = JSON.stringify(input);
  const first = projectCheckerboard(input, 4);
  assert.deepEqual(projectCheckerboard(input, 4), first);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(first.filter((p) => p.imageUrl), input.filter((p) => p.imageUrl));
  assert.deepEqual(first.filter((p) => !p.imageUrl), input.filter((p) => !p.imageUrl));
});

test("every input reference appears exactly once for different group sizes and column counts", () => {
  for (const columns of [1, 2, 4]) {
    for (let images = 0; images <= 8; images++) {
      for (let whites = 0; whites <= 8; whites++) {
        const input = collection(images, whites);
        const result = projectCheckerboard(input, columns);
        assert.equal(result.length, input.length);
        assert.equal(new Set(result).size, input.length);
        assert.ok(input.every((project) => result.includes(project)));
      }
    }
  }
});

test("each filter is applied before ordering rather than leaving holes in the All arrangement", () => {
  const input = [image("rI", "rural"), white("rW", "rural"), image("uI1"),
    image("interI", "inter-urban"), white("uW1"), white("interW", "inter-urban"), image("uI2"), white("uW2")];
  assert.equal(ids(projectCheckerboard(input.filter((p) => p.type === "urban"), 2)), "uW1 uI1 uI2 uW2");
  assert.equal(ids(projectCheckerboard(input.filter((p) => p.type === "urban"), 4)), "uW1 uI1 uW2 uI2");
  for (const type of ["rural", "inter-urban"]) {
    const filtered = input.filter((p) => p.type === type);
    assert.deepEqual(projectCheckerboard(filtered, 4), [filtered[1], filtered[0]]);
  }
});

test("invalid column counts are rejected", () => {
  for (const columns of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => projectCheckerboard([], columns), RangeError);
  }
});
