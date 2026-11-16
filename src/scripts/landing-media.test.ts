import assert from "node:assert/strict";
import test from "node:test";
import { landingMedia } from "../lib/landingMedia.ts";
import type { HeroImage } from "../types/HeroMedia.ts";

const image = (name: string, width = 3000): HeroImage => ({
  altText: name,
  asset: { url: `https://cdn.sanity.io/images/project/production/${name}.jpg`, metadata: { dimensions: { width, height: 2000 } } },
});
const copper = { title: "Copper House", postCode: "CB2", heroImage: image("copper-original") };

test("configured landing media wins over the Copper House fallback", () => {
  const result = landingMedia({ heroImage: image("configured"), heroVideo: { url: "desktop.mp4" }, landingFallbackProject: copper });
  assert.match(result.desktop.url, /configured\.jpg/);
  assert.equal(result.videos.desktop, "desktop.mp4");
  assert.equal(result.mobile, result.desktop);
  assert.equal(result.videos.mobile, "desktop.mp4");
  assert.equal(result.fallbackProject, undefined);
});

test("a configured mobile image replaces desktop video unless mobile video is supplied", () => {
  const content = { heroImage: image("desktop"), heroVideo: { url: "desktop.mp4" }, mobileHeroImage: image("mobile") };
  const still = landingMedia(content);
  assert.match(still.mobile.url, /mobile\.jpg/);
  assert.equal(still.videos.mobile, "");
  const video = landingMedia({ ...content, mobileHeroVideo: { url: "mobile.mp4" } });
  assert.equal(video.videos.mobile, "mobile.mp4");
  assert.equal(video.videos.desktop, "desktop.mp4");
});

test("mobile-only media keeps the Copper House image on desktop", () => {
  const result = landingMedia({ mobileHeroVideo: { url: "mobile.mp4" }, landingFallbackProject: copper });
  assert.match(result.desktop.url, /copper-original/);
  assert.equal(result.videos.desktop, "");
  assert.equal(result.videos.mobile, "mobile.mp4");
  assert.equal(result.fallbackProject, undefined);
});

test("Copper House uses its real hero image with responsive widths, never square thumbnail parameters", () => {
  const result = landingMedia({ landingFallbackProject: copper });
  const url = new URL(result.desktop.url);
  assert.match(url.pathname, /copper-original\.jpg$/);
  assert.equal(url.searchParams.get("h"), null);
  assert.equal(url.searchParams.get("fit"), "max");
  assert.equal(url.searchParams.get("w"), "1920");
  assert.equal(result.fallbackProject, copper);
  assert.equal(result.mobile, result.desktop);
  assert.match(result.desktop.srcset!, /2560w$/);
});

test("the selected hero's crop and hotspot survive image optimisation without upscaling", () => {
  const cropped = { ...image("cropped", 1000), crop: { left: .1, right: .1, top: 0, bottom: 0 }, hotspot: { x: .3, y: .4 } };
  const result = landingMedia({ heroImage: cropped });
  const url = new URL(result.desktop.url);
  assert.equal(url.searchParams.get("rect"), "100,0,800,2000");
  assert.equal(url.searchParams.get("w"), "800");
  assert.equal(result.desktop.position, "24.999999999999996% 40%");
  assert.match(result.desktop.srcset!, /800w$/);
  assert.doesNotMatch(result.desktop.srcset!, /1024w/);
});

test("missing or unusable Copper House media falls back to the existing local architectural asset", () => {
  assert.equal(landingMedia(null).desktop.url, "/images/copper.jpg");
  const result = landingMedia({ heroImage: { asset: { url: "bad URL" } }, landingFallbackProject: { heroImage: { asset: { url: "javascript:bad" } } } });
  assert.equal(result.desktop.url, "/images/copper.jpg");
  assert.equal(result.fallbackProject, undefined);
});

test("configured copy is used verbatim; absent copy uses the release holding-page headline", () => {
  assert.equal(landingMedia({ landingHeading: "  Existing CMS heading  ", landingText: "Existing\nsupporting text" }).heading, "Existing CMS heading");
  assert.equal(landingMedia({ landingText: "Existing\nsupporting text" }).text, "Existing\nsupporting text");
  assert.equal(landingMedia({ landingHeading: " " }).heading, "Progressive places\nfor living, working,\nlearning and community.");
  assert.equal(landingMedia({}).text, "");
});
