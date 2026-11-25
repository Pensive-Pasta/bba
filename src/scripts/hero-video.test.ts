import assert from "node:assert/strict";
import test from "node:test";
import { initHeroVideo } from "./hero-video.ts";

class Element extends EventTarget {
  dataset: Record<string, string> = {};
  classes = new Set(["opacity-0"]);
  classList = {
    add: (name: string) => { this.classes.add(name); },
    remove: (name: string) => { this.classes.delete(name); },
  };
  attributes = new Map<string, string>();
  textContent = "";
  hidden = true;
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  hasAttribute(name: string) { return this.attributes.has(name); }
  removeAttribute(name: string) { this.attributes.delete(name); }
}

class Video extends Element {
  currentSrc = "";
  readyState = 0;
  paused = true;
  muted = false;
  error = null;
  rejectPlayback = false;
  sources = [{ src: "desktop.mp4", remove: () => { this.sources = []; } }];
  set src(value: string) { this.setAttribute("src", value); }
  querySelector() { return this.sources[0]; }
  querySelectorAll() { return this.sources; }
  pause() { this.paused = true; this.dispatchEvent(new Event("pause")); }
  load() { this.readyState = 0; }
  async play() {
    if (this.rejectPlayback) throw new Error("Autoplay blocked");
    this.paused = false;
  }
}

function environment({ blocked = false, reducedMotion = false } = {}) {
  const video = new Video(), button = new Element();
  video.rejectPlayback = blocked;
  const desktop = Object.assign(new EventTarget(), { matches: true });
  const reduced = Object.assign(new EventTarget(), { matches: reducedMotion });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const root = Object.assign(new Element(), {
    querySelector: (selector: string) => selector === "video" ? video : button,
  });
  root.dataset.desktopVideo = "desktop.mp4";
  for (const [key, value] of Object.entries({
    window: {}, document,
    matchMedia: (query: string) => query.includes("reduced-motion") ? reduced : desktop,
  })) Object.defineProperty(globalThis, key, { configurable: true, value });
  const dispose = initHeroVideo(root as unknown as HTMLElement)!;
  return { video, button, root, reduced, document, dispose };
}

test("the photograph remains visible until a video frame is ready, then video fades in", () => {
  const env = environment();
  assert.equal(env.video.classes.has("opacity-0"), true);
  env.video.dispatchEvent(new Event("playing"));
  assert.equal(env.video.classes.has("opacity-0"), true);
  env.video.readyState = 2;
  env.video.dispatchEvent(new Event("playing"));
  assert.equal(env.video.classes.has("opacity-0"), false);
  env.dispose();
});

test("blocked autoplay retains the photograph even when video data has loaded; manual play can reveal it", async () => {
  const env = environment({ blocked: true });
  await Promise.resolve();
  env.video.readyState = 2;
  env.video.dispatchEvent(new Event("loadeddata"));
  assert.equal(env.video.classes.has("opacity-0"), true);
  assert.equal(env.button.hidden, false);
  assert.equal(env.button.textContent, "Play video");
  env.video.rejectPlayback = false;
  env.button.dispatchEvent(new Event("click"));
  env.video.dispatchEvent(new Event("playing"));
  assert.equal(env.video.classes.has("opacity-0"), false);
  env.dispose();
});

test("video failure restores the photograph and reduced motion never reveals video", () => {
  const env = environment();
  env.video.readyState = 2;
  env.video.dispatchEvent(new Event("playing"));
  env.video.dispatchEvent(new Event("error"));
  assert.equal(env.video.classes.has("opacity-0"), true);
  assert.equal(env.root.dataset.videoFallback, "true");
  env.dispose();

  const reduced = environment({ reducedMotion: true });
  reduced.video.readyState = 2;
  reduced.video.dispatchEvent(new Event("playing"));
  assert.equal(reduced.video.classes.has("opacity-0"), true);
  assert.equal(reduced.button.hidden, true);
  reduced.dispose();
});

test("navigation removes playback listeners and hides any previous video frame", () => {
  const env = environment();
  env.video.readyState = 2;
  env.video.dispatchEvent(new Event("playing"));
  env.document.dispatchEvent(new Event("astro:before-swap"));
  assert.equal(env.video.classes.has("opacity-0"), true);
  assert.equal(env.root.dataset.videoReady, undefined);
  env.video.readyState = 2;
  env.video.paused = false;
  env.video.dispatchEvent(new Event("playing"));
  assert.equal(env.video.classes.has("opacity-0"), true);
});
