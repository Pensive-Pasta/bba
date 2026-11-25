import assert from "node:assert/strict";
import test from "node:test";
import { imageAlt } from "../lib/imageAlt.ts";

test("image descriptions preserve placement overrides and intentionally empty decorative text", () => {
  assert.equal(imageAlt({altText: "Approved local description", asset: {altText: "Shared asset description"}}), "Approved local description");
  assert.equal(imageAlt({altText: "", asset: {altText: "Shared asset description"}}), "");
  assert.equal(imageAlt({decorative: true, altText: "Old text"}), "");
  assert.equal(imageAlt({asset: {altText: "Shared asset description"}}), "Shared asset description");
  assert.equal(imageAlt({}), "");
});
