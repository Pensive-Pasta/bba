import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { initAnimatedPillGroup, moveIndicatorTo } from "../../public/scripts/animatedPills.js";

class Element extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  classes = new Set<string>();
  classList = {
    contains: (name: string) => this.classes.has(name),
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    toggle: (name: string, force = !this.classes.has(name)) => { if (force) this.classes.add(name); else this.classes.delete(name); return force; },
    replace: (from: string, to: string) => { if (!this.classes.has(from)) return false; this.classes.delete(from); this.classes.add(to); return true; },
  };
  style = { width: "", transform: "" };
  nodes = new Map<string, Element>();
  buttons: Element[] = [];
  group?: Element;
  left = 10;
  width = 400;
  getBoundingClientRect() { return { left: this.left, width: this.width }; }
  querySelector(selector: string) { return this.nodes.get(selector) || null; }
  querySelectorAll(selector: string) { return selector === "[data-pill-button]" ? this.buttons : []; }
  closest() { return this.group; }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
}
class Observer {
  static all: Observer[] = [];
  active = true;
  callback: () => void;
  constructor(callback: () => void) { this.callback = callback; Observer.all.push(this); }
  observe() {}
  disconnect() { this.active = false; }
  resize() { if (this.active) this.callback(); }
}
function group(values: string[]) {
  const root = new Element(), indicator = new Element();
  root.nodes.set("[data-pill-indicator]", indicator);
  root.buttons = values.map((value, index) => {
    const button = new Element();
    button.dataset.type = value;
    button.dataset.tab = value;
    button.setAttribute("data-tab", value);
    button.group = root;
    button.left = 12 + index * 100;
    button.width = 100;
    if (!index) button.classes.add("active-filter");
    return button;
  });
  return { root, indicator, buttons: root.buttons };
}
function environment(values = ["all", "news", "projects", "thinking"], fonts?: Promise<unknown>) {
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const window = new EventTarget();
  const ids = new Map<string, Element>();
  const queries = new Map<string, Element>();
  const lists = new Map<string, Element[]>();
  const document = Object.assign(new EventTarget(), {
    readyState: "complete",
    fonts: fonts ? { ready: fonts } : undefined,
    getElementById: (id: string) => ids.get(id) || null,
    querySelector: (selector: string) => queries.get(selector) || null,
    querySelectorAll: (selector: string) => lists.get(selector) || [],
  });
  for (const [key, value] of Object.entries({
    document, window, ResizeObserver: Observer,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (frame: number) => frames.delete(frame),
  })) Object.defineProperty(globalThis, key, { configurable: true, value });
  const fixture = group(values);
  const cleanup = initAnimatedPillGroup(fixture.root as unknown as HTMLElement)!;
  const flush = () => { const batch = [...frames.values()]; frames.clear(); batch.forEach((callback) => callback(0)); };
  const run = (filename: string) => runInNewContext(readFileSync(new URL(`../../public/scripts/${filename}`, import.meta.url), "utf8"), { document, window, requestAnimationFrame, setTimeout });
  flush();
  return { ...fixture, window, document, frames, ids, queries, lists, cleanup, flush, run };
}

test("the extracted Work calculation uses the target's actual width and original two-pixel border offset", () => {
  const env = environment();
  const target = env.buttons[1];
  target.left = 113.5;
  target.width = 147.25;
  moveIndicatorTo(target as unknown as HTMLElement);
  assert.equal(env.indicator.style.width, "100px");
  env.flush();
  assert.equal(env.indicator.style.width, "147.25px");
  assert.equal(env.indicator.style.transform, "translateX(101.5px)");
  env.cleanup();
});

test("selecting differently sized tabs moves one indicator and updates accessible active state", () => {
  const env = environment();
  env.buttons[2].width = 135;
  env.buttons[2].dispatchEvent(new Event("click"));
  env.flush();
  assert.equal(env.indicator.style.width, "135px");
  assert.equal(env.indicator.style.transform, "translateX(200px)");
  assert.deepEqual(env.buttons.map((button) => button.getAttribute("aria-pressed")), ["false", "false", "true", "false"]);
  assert.equal(env.buttons.filter((button) => button.classes.has("active-filter")).length, 1);
  env.cleanup();
});

test("container/button resize and viewport changes reposition the selected pill", () => {
  const env = environment();
  env.buttons[1].dispatchEvent(new Event("click")); env.flush();
  env.buttons[1].left = 150;
  env.buttons[1].width = 180;
  Observer.all.at(-1)!.resize(); env.flush();
  assert.equal(env.indicator.style.transform, "translateX(138px)");
  assert.equal(env.indicator.style.width, "180px");
  env.buttons[1].left = 170;
  env.window.dispatchEvent(new Event("resize")); env.flush();
  assert.equal(env.indicator.style.transform, "translateX(158px)");
  env.cleanup();
});

test("font loading corrects initial text measurement without changing the selected tab", async () => {
  let loaded!: () => void;
  const ready = new Promise<void>((resolve) => { loaded = resolve; });
  const env = environment(undefined, ready);
  env.buttons[0].width = 120;
  loaded(); await ready; env.flush();
  assert.equal(env.indicator.style.width, "120px");
  assert.equal(env.buttons[0].getAttribute("aria-pressed"), "true");
  env.cleanup();
});

test("independent pill groups use their own indicator rather than a global element ID", () => {
  const env = environment();
  const second = group(["profile", "people"]);
  const cleanup = initAnimatedPillGroup(second.root as unknown as HTMLElement)!;
  second.buttons[1].width = 160;
  second.buttons[1].dispatchEvent(new Event("click")); env.flush();
  assert.equal(second.indicator.style.width, "160px");
  assert.equal(env.indicator.style.width, "100px");
  cleanup(); env.cleanup();
});

test("navigation cleanup cancels pending movement and permits rebinding without duplicate handlers", () => {
  const env = environment();
  assert.equal(initAnimatedPillGroup(env.root as unknown as HTMLElement), undefined);
  env.buttons[1].dispatchEvent(new Event("click"));
  assert.equal(env.frames.size, 1);
  env.document.dispatchEvent(new Event("astro:before-swap"));
  assert.equal(env.frames.size, 0);
  assert.equal(Observer.all.at(-1)!.active, false);
  env.buttons[2].dispatchEvent(new Event("click"));
  assert.equal(env.frames.size, 0);
  assert.equal(env.buttons[1].getAttribute("aria-pressed"), "true");
  const cleanup = initAnimatedPillGroup(env.root as unknown as HTMLElement)!;
  env.buttons[2].dispatchEvent(new Event("click")); env.flush();
  assert.equal(env.buttons[2].getAttribute("aria-pressed"), "true");
  cleanup();
});

test("Studio keeps its section switching while the shared component controls the pill", () => {
  const values = ["profile", "people", "values", "awards"];
  const env = environment(values);
  env.lists.set(".tab", env.buttons);
  values.forEach((id, index) => { const panel = new Element(); if (index) panel.classes.add("hidden"); env.ids.set(id, panel); });
  env.run("studioTabs.js");
  env.document.dispatchEvent(new Event("astro:page-load"));
  env.document.dispatchEvent(new Event("astro:after-swap"));
  env.buttons[1].dispatchEvent(new Event("click")); env.flush();
  assert.equal(env.ids.get("people")!.classes.has("hidden"), false);
  assert.equal(env.ids.get("profile")!.classes.has("hidden"), true);
  assert.equal(env.buttons[1].getAttribute("aria-pressed"), "true");
  assert.equal(env.indicator.style.transform, "translateX(100px)");
  env.cleanup();
});

test("Insights still filters the stored thinking category while displaying the Perspectives pill", () => {
  const values = ["all", "news", "projects", "thinking"];
  const env = environment(values);
  env.lists.set(".insight-tab", env.buttons);
  values.forEach((id, index) => { const panel = new Element(); if (index) panel.classes.add("hidden"); env.ids.set(`insight-${id}`, panel); });
  env.run("insightTabs.js");
  env.document.dispatchEvent(new Event("astro:page-load"));
  env.buttons[3].dispatchEvent(new Event("click")); env.flush();
  assert.equal(env.ids.get("insight-thinking")!.classes.has("hidden"), false);
  assert.equal(env.ids.get("insight-all")!.classes.has("hidden"), true);
  assert.equal(env.buttons[3].getAttribute("aria-pressed"), "true");
  env.cleanup();
});

test("Work preserves filtering and its animated Index/Grid toggle alongside shared pills", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = environment(["both", "urban", "inter-urban", "rural"]);
  const toggle = new Element(), grid = new Element(), index = new Element(), indexLabel = new Element(), gridLabel = new Element();
  index.classList.add("hidden", "opacity-0"); grid.classes.add("opacity-100");
  indexLabel.classes.add("opacity-100"); gridLabel.classList.add("hidden", "opacity-0");
  toggle.nodes.set("#label-index", indexLabel); toggle.nodes.set("#label-grid", gridLabel);
  env.ids.set("index-toggle", toggle); env.ids.set("project-index", index);
  env.queries.set(".project-grid", grid); env.queries.set(".filter-toggle-group", env.root);
  env.lists.set(".filter-btn", env.buttons);
  const cards = ["urban", "inter-urban", "rural"].map((type) => { const card = new Element(); card.dataset.type = type; return card; });
  env.lists.set(".project-grid .card", cards);
  env.run("projectToggle.js");
  env.buttons[1].dispatchEvent(new Event("click")); env.flush();
  assert.deepEqual(cards.map((card) => card.classes.has("hidden")), [false, true, true]);
  assert.equal(env.buttons[1].getAttribute("aria-pressed"), "true");
  toggle.dispatchEvent(new Event("click")); t.mock.timers.tick(300); env.flush();
  assert.equal(index.classes.has("hidden"), false);
  assert.equal(index.classes.has("opacity-100"), true);
  assert.equal(grid.classes.has("opacity-0"), true);
  assert.equal(grid.classes.has("hidden"), true);
  assert.equal(env.root.classes.has("opacity-0"), true);
  toggle.dispatchEvent(new Event("click")); t.mock.timers.tick(300); env.flush();
  assert.equal(index.classes.has("hidden"), true);
  assert.equal(index.classes.has("opacity-0"), true);
  assert.equal(grid.classes.has("opacity-100"), true);
  assert.equal(grid.classes.has("hidden"), false);
  assert.equal(env.root.classes.has("opacity-0"), false);
  assert.deepEqual(cards.map((card) => card.classes.has("hidden")), [false, true, true]);
  env.cleanup();
});
