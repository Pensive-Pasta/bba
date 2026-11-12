import assert from "node:assert/strict";
import test from "node:test";
import { initHeroVideo } from "./hero-video.ts";
import { heroVideos } from "../lib/heroMedia.ts";

// Media playback is simulated: these tests cover source/lifecycle decisions,
// not browser decoding or visual transitions.
class TestElement extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  elements = new Map<string, TestElement>();
  sources: Array<{ src: string; remove(): void }> = [];
  parentCard?: TestElement;
  hidden = false;
  textContent = "";
  classes = new Set(["opacity-0"]);
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
  };
  querySelector(selector: string) { return selector === "source" ? this.sources[0] : this.elements.get(selector) ?? null; }
  querySelectorAll() { return this.sources; }
  closest() { return this.parentCard; }
  contains(node: unknown) { return node === this; }
  matches() { return false; }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  hasAttribute(name: string) { return this.attributes.has(name); }
}

class TestVideo extends TestElement {
  paused = true;
  muted = true;
  preload = "none";
  readyState = 0;
  currentTime = 0;
  currentSrc = "";
  error: unknown = null;
  playCalls = 0;
  sourceAssignments = 0;
  rejectPlayback = false;
  get src() { return this.getAttribute("src") ?? ""; }
  set src(value: string) {
    this.sourceAssignments++;
    this.setAttribute("src", value);
    this.currentSrc = value;
    this.readyState = 0;
  }
  play() {
    this.playCalls++;
    if (this.rejectPlayback) return Promise.reject(new Error("Autoplay blocked"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; this.dispatchEvent(new Event("pause")); }
  load() { this.currentSrc = this.src || this.sources[0]?.src || ""; this.readyState = 0; }
  frame() { this.readyState = 2; this.dispatchEvent(new Event("loadeddata")); }
}

class TestMedia extends EventTarget {
  matches: boolean;
  constructor(matches: boolean) { super(); this.matches = matches; }
  change(value: boolean) { this.matches = value; this.dispatchEvent(new Event("change")); }
}

class TestObserver {
  static instances: TestObserver[] = [];
  active = true;
  private callback: (entries: Array<{ isIntersecting: boolean }>) => void;
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) { this.callback = callback; TestObserver.instances.push(this); }
  observe() {}
  disconnect() { this.active = false; }
  visible(value: boolean) { if (this.active) this.callback([{ isIntersecting: value }]); }
}

const registry = new Map<string, CustomElementConstructor>();
function environment() {
  const desktop = new TestMedia(true);
  const reduced = new TestMedia(false);
  const hover = new TestMedia(true);
  const document = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  const connection = Object.assign(new EventTarget(), { saveData: false });
  for (const [key, value] of Object.entries({
    document,
    window: { IntersectionObserver: TestObserver },
    IntersectionObserver: TestObserver,
    matchMedia: (query: string) => query.includes("reduced-motion") ? reduced : query.includes("hover") ? hover : desktop,
    HTMLElement: TestElement,
    Node: TestElement,
    navigator: { connection },
    customElements: { get: (name: string) => registry.get(name), define: (name: string, constructor: CustomElementConstructor) => registry.set(name, constructor) },
  })) Object.defineProperty(globalThis, key, { configurable: true, value });
  return { desktop, reduced, hover, document, connection };
}

function hero() {
  const env = environment();
  const root = new TestElement();
  const video = new TestVideo();
  const button = new TestElement();
  root.dataset.desktopVideo = "https://example.test/desktop.mp4";
  root.elements.set("video", video);
  root.elements.set("[data-hero-playback]", button);
  const native = { src: root.dataset.desktopVideo, remove: () => { video.sources = []; } };
  video.sources = [native];
  const start = () => {
    initHeroVideo(root as unknown as HTMLElement);
    return TestObserver.instances.at(-1)!;
  };
  return { ...env, root, video, button, start, cleanup: () => env.document.dispatchEvent(new Event("astro:before-swap")) };
}

test("hero adopts its native video source and reveals a decoded frame without a photo poster", (t) => {
  const fixture = hero(); t.after(fixture.cleanup);
  const observer = fixture.start();
  observer.visible(true);
  assert.equal(fixture.video.sourceAssignments, 0);
  assert.equal(fixture.video.playCalls, 1);
  assert.equal(fixture.video.classList.contains("opacity-0"), true);
  fixture.video.frame();
  assert.equal(fixture.video.classList.contains("opacity-0"), false);
  assert.equal(fixture.video.hasAttribute("poster"), false);
  assert.equal(fixture.root.dataset.videoFallback, undefined);
});

test("mobile image overrides and reduced motion stop video and ignore late playing events", (t) => {
  const fixture = hero(); t.after(fixture.cleanup);
  fixture.desktop.change(false);
  const observer = fixture.start(); observer.visible(true);
  assert.equal(fixture.video.playCalls, 0);
  assert.equal(fixture.video.src, "");
  assert.equal(fixture.button.hidden, true);
  fixture.desktop.change(true);
  assert.equal(fixture.video.src, fixture.root.dataset.desktopVideo);
  fixture.reduced.change(true);
  fixture.video.dispatchEvent(new Event("playing"));
  assert.equal(fixture.video.src, "");
  assert.equal(fixture.video.paused, true);
  assert.equal(fixture.button.hidden, true);
});

test("blocked hero autoplay keeps the video's frame; actual failure enables the image fallback", async (t) => {
  const fixture = hero(); t.after(fixture.cleanup);
  fixture.video.rejectPlayback = true;
  const observer = fixture.start(); observer.visible(true);
  fixture.video.frame();
  await Promise.resolve();
  assert.equal(fixture.root.dataset.videoFallback, undefined);
  assert.equal(fixture.video.classList.contains("opacity-0"), false);
  assert.equal(fixture.button.textContent, "Play video");
  fixture.video.dispatchEvent(new Event("error"));
  assert.equal(fixture.root.dataset.videoFallback, "true");
  fixture.video.rejectPlayback = false;
  fixture.button.dispatchEvent(new Event("click"));
  assert.equal(fixture.root.dataset.videoFallback, undefined);
  assert.equal(fixture.video.src, fixture.root.dataset.desktopVideo);
});

test("hero cleanup pauses playback and removes navigation/media listeners", () => {
  const fixture = hero();
  const observer = fixture.start(); observer.visible(true);
  fixture.cleanup();
  const calls = fixture.video.playCalls;
  fixture.button.dispatchEvent(new Event("click"));
  fixture.reduced.change(true); fixture.reduced.change(false);
  observer.visible(true);
  assert.equal(fixture.video.playCalls, calls);
  assert.equal(fixture.video.paused, true);
  assert.equal(fixture.root.dataset.videoReady, undefined);
});

test("responsive video selection preserves mobile-video and mobile-image priorities", () => {
  const desktop = { url: "desktop.mp4" }, mobile = { url: "mobile.mp4" };
  assert.deepEqual(heroVideos(desktop, mobile, true), { desktop: "desktop.mp4", mobile: "mobile.mp4" });
  assert.equal(heroVideos(desktop, undefined, true).mobile, "");
  assert.equal(heroVideos(desktop).mobile, "desktop.mp4");
});

test("homepage preview waits for hover and playing, then restores the photograph on exit", async () => {
  environment();
  await import("./project-video-preview.ts");
  const Constructor = registry.get("bba-video-preview")!;
  const root = new Constructor() as unknown as TestElement & { connectedCallback(): void; disconnectedCallback(): void };
  const card = new TestElement(), video = new TestVideo();
  root.parentCard = card;
  root.elements.set("video", video);
  root.dataset.videoUrl = "https://example.test/preview.mp4";
  root.connectedCallback();
  const observer = TestObserver.instances.at(-1)!; observer.visible(true);
  assert.equal(video.src, "");
  assert.equal(video.playCalls, 0);
  card.dispatchEvent(new Event("pointerenter"));
  assert.equal(video.src, root.dataset.videoUrl);
  assert.equal(video.classList.contains("opacity-0"), true);
  video.frame();
  assert.equal(video.classList.contains("opacity-0"), true);
  video.dispatchEvent(new Event("playing"));
  assert.equal(video.classList.contains("opacity-0"), false);
  video.currentTime = 3;
  card.dispatchEvent(new Event("pointerleave"));
  assert.equal(video.paused, true);
  assert.equal(video.currentTime, 0);
  assert.equal(video.classList.contains("opacity-0"), true);
  root.disconnectedCallback();
  const calls = video.playCalls;
  card.dispatchEvent(new Event("pointerenter"));
  assert.equal(video.playCalls, calls);
  assert.equal(video.src, "");
});

test("homepage previews respect reduced motion and data saver", async () => {
  const env = environment(); env.reduced.change(true);
  await import("./project-video-preview.ts");
  const Constructor = registry.get("bba-video-preview")!;
  const root = new Constructor() as unknown as TestElement & { connectedCallback(): void; disconnectedCallback(): void };
  const card = new TestElement(), video = new TestVideo();
  root.parentCard = card; root.elements.set("video", video); root.dataset.videoUrl = "https://example.test/preview.mp4";
  root.connectedCallback(); TestObserver.instances.at(-1)!.visible(true);
  card.dispatchEvent(new Event("pointerenter"));
  assert.equal(video.src, "");
  env.reduced.change(false);
  assert.equal(video.playCalls, 1);
  env.connection.saveData = true; env.connection.dispatchEvent(new Event("change"));
  assert.equal(video.src, ""); assert.equal(video.paused, true);
  root.disconnectedCallback();
});
