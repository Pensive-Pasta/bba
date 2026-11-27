import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("./home-project-grid.js", import.meta.url), "utf8");
const media = [
  ["centre-point", "PE2", "inter-urban"], ["copper-house", "CB1", "urban"],
  ["eastcroft", "PE27", "rural"], ["oundle-bookshop", "PE8", "inter-urban"],
  ["pitch-view", "PE9", "inter-urban"], ["old-stables", "PE28", "rural"],
  ["western-park", "LE3", "urban"], ["woodlands-pavilion", "PE5", "rural"],
].map(([id, postCode, type]) => ({ id, postCode, type }));
const postcodes = [
  ...media.map((p) => ({ _id: p.id, postCode: p.postCode })),
  ...Array.from({ length: 40 }, (_, i) => ({ _id: `index-${i}`, postCode: `NN${i % 20}` })),
  { _id: "same-code-as-media", postCode: "PE2" },
];
const pattern = ["postcode", "media", "media", "postcode", "postcode", "media", "media", "postcode", "postcode", "media", "media", "postcode"];

// Minimal DOM surface used by the inline script. Cards are cloned as a whole,
// allowing tests to check identity, labels and associated media together.
class Element {
  kind: string;
  dataset: Record<string, string>;
  children: Element[] = [];
  textContent = "";
  href = "";
  image = "";
  replacements = 0;
  classes = new Set<string>();
  classList = {
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    contains: (name: string) => this.classes.has(name),
  };
  constructor(kind: string, dataset: Record<string, string> = {}) { this.kind = kind; this.dataset = dataset; }
  querySelectorAll(selector: string): Element[] {
    const kind = selector === "[data-project-tile]" ? "image" : "label";
    return this.children.flatMap((child) => [...(child.kind === kind ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0]; }
  cloneNode(deep = false): Element {
    const clone = new Element(this.kind, { ...this.dataset });
    clone.textContent = this.textContent;
    clone.href = this.href; clone.image = this.image;
    clone.classes = new Set(this.classes);
    if (deep) clone.children = this.children.map((child) => child.cloneNode(true));
    return clone;
  }
  replaceChildren(...children: Element[]) { this.children = children; this.replacements++; }
}

function cell(slot: string, id: string, label: string) {
  const result = new Element("cell", { homeSlot: slot, projectId: id });
  const text = new Element("label"); text.textContent = label;
  result.children.push(text);
  if (slot === "media") {
    const card = new Element("image");
    card.href = `/work/${id}`; card.image = `image-${id}`;
    result.children.push(card);
  }
  return result;
}

function page(options: { home?: boolean; mediaCount?: number; postcodes?: typeof postcodes; malformed?: boolean } = {}) {
  const grid = new Element("grid");
  grid.children = pattern.map((slot, i) => cell(slot, `editorial-${i}`, `CODE${i}`));
  const templates = media.slice(0, options.mediaCount ?? 8).map((p) => ({
    dataset: { projectId: p.id, projectType: p.type, postcode: p.postCode },
    content: { firstElementChild: cell("media", p.id, p.postCode) },
  }));
  const json = { textContent: options.malformed ? "invalid JSON" : JSON.stringify(options.postcodes ?? postcodes) };
  const root = {
    querySelector: (selector: string) => selector === ".home-project-grid" ? grid : json,
    querySelectorAll: () => templates,
  };
  const attributes = new Map<string, string>();
  const doc = Object.assign(new EventTarget(), {
    root: options.home === false ? undefined : root,
    documentElement: {
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      removeAttribute: (key: string) => attributes.delete(key),
    },
    importNode: (node: Element, deep: boolean) => node.cloneNode(deep),
    querySelector(selector: string) {
      return selector === "[data-home-projects]" ? this.root : this.root ? gridFor(this.root) : undefined;
    },
  });
  function gridFor(value: typeof root) { return value.querySelector(".home-project-grid"); }
  return { doc, root, grid, attributes, templates };
}

function environment(options: { seed?: number; home?: boolean; navigation?: string; history?: any; mediaCount?: number; postcodes?: typeof postcodes; malformed?: boolean } = {}) {
  const view = page(options);
  const window = Object.assign(new EventTarget(), { __bbaHomeGrid: undefined as any });
  const history = { state: options.history === null ? null : options.history ?? { index: 0, unrelated: 42 }, replaceState(value: any) { this.state = value; } };
  let seed = options.seed ?? 2026, randomCalls = 0, nextId = 0;
  const math = Object.create(Math);
  math.random = () => { randomCalls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const timers = new Map<number, () => void>(), frames = new Map<number, () => void>();
  const context = {
    window, document: view.doc, history, Math: math, AbortController,
    location: { pathname: options.home === false ? "/work" : "/" },
    performance: { getEntriesByType: () => [{ type: options.navigation ?? "navigate" }] },
    setTimeout: (callback: () => void) => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: (id: number) => timers.delete(id),
    requestAnimationFrame: (callback: () => void) => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  };
  const run = () => runInNewContext(source, context);
  run();
  const initialise = () => window.__bbaHomeGrid.initialise(view.doc);
  const flushFrames = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback()); };
  const flushTimers = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((callback) => callback()); };
  return { ...view, window, history, timers, frames, run, initialise, flushFrames, flushTimers, randomCalls: () => randomCalls };
}

const ids = (grid: Element) => grid.children.map((cell) => cell.dataset.projectId);
const labels = (grid: Element) => grid.children.map((cell) => cell.querySelector("[data-home-postcode-label]").textContent);
const mediaCells = (grid: Element) => grid.children.filter((cell) => cell.dataset.homeSlot === "media");

test("samples six of eight media projects, including every candidate across visits, without changing slots or card associations", () => {
  const seen = new Set<string>(), arrangements = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const env = environment({ seed }); env.initialise();
    assert.deepEqual(env.grid.children.map((cell) => cell.dataset.homeSlot), pattern);
    const selected = mediaCells(env.grid);
    assert.equal(selected.length, 6);
    assert.equal(new Set(selected.map((cell) => cell.dataset.projectId)).size, 6);
    for (const selectedCell of selected) {
      const id = selectedCell.dataset.projectId, project = media.find((p) => p.id === id)!;
      assert.ok(project); seen.add(id);
      assert.equal(selectedCell.querySelector("[data-home-postcode-label]").textContent, project.postCode);
      assert.equal(selectedCell.children[1].href, `/work/${id}`);
      assert.equal(selectedCell.children[1].image, `image-${id}`);
    }
    arrangements.add(ids(env.grid).join(","));
  }
  assert.equal(seen.size, 8);
  assert.ok(arrangements.size > 1);
});

test("postcode selection excludes all selected project identities and prefers twelve distinct visible labels", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const env = environment({ seed }); env.initialise();
    assert.equal(new Set(ids(env.grid)).size, 12);
    assert.equal(new Set(labels(env.grid)).size, 12);
    for (const cell of env.grid.children.filter((cell) => cell.dataset.homeSlot === "postcode")) {
      assert.equal(cell.children.length, 1);
      assert.equal(cell.children[0].href, "");
    }
  }
});

test("a bounded rearrangement separates neighbouring types while keeping the sampled six", () => {
  const env = environment(); env.initialise();
  const types = mediaCells(env.grid).map((cell) => media.find((p) => p.id === cell.dataset.projectId)!.type);
  assert.ok(types.every((type, i) => i === 0 || type !== types[i - 1]));
  assert.ok(env.randomCalls() <= 7 + 16 * 5 + postcodes.length - 1);
});

test("repeated lifecycle events, resize, hover and scrolling never resample an initialised grid", () => {
  const env = environment(); env.initialise();
  const selected = ids(env.grid), calls = env.randomCalls();
  env.initialise(); env.run();
  for (const name of ["DOMContentLoaded", "astro:after-swap", "astro:page-load"]) env.doc.dispatchEvent(new Event(name));
  for (const name of ["resize", "pointerenter", "scroll", "wheel", "touchmove"]) env.window.dispatchEvent(new Event(name));
  env.flushFrames();
  assert.deepEqual(ids(env.grid), selected);
  assert.equal(env.grid.replacements, 1);
  assert.equal(env.randomCalls(), calls);
  assert.equal(env.timers.size, 0);
  assert.equal(env.history.state.unrelated, 42);
});

test("all six images, including Eastcroft, share the timer and scroll-gesture fade without resampling", () => {
  const saved = {
    media: media.slice(0, 6).map((p) => p.id),
    postcodes: postcodes.slice(8, 14).map((p) => p._id),
  };
  for (const trigger of ["timer", "scroll", "wheel", "touchmove"]) {
    const env = environment({ navigation: "back_forward", history: { index: 0, bbaHomeProjects: saved } });
    assert.equal(env.attributes.has("data-home-grid-pending"), true);
    env.initialise();
    assert.equal(env.attributes.has("data-home-grid-pending"), false);
    assert.ok(ids(env.grid).includes("eastcroft"));
    const selected = ids(env.grid);
    const images = env.grid.querySelectorAll("[data-project-tile]");
    assert.equal(images.length, 6);
    assert.ok(images.every((tile) => tile.classList.contains("opacity-0") && tile.classList.contains("pointer-events-none")));
    if (trigger === "timer") env.flushTimers();
    else env.window.dispatchEvent(new Event(trigger));
    env.flushFrames();
    assert.ok(images.every((tile) => tile.classList.contains("opacity-100") && !tile.classList.contains("pointer-events-none")));
    assert.deepEqual(ids(env.grid), selected);
    assert.equal(env.grid.replacements, 1);
  }
});

test("ClientRouter prepares an incoming home document before swap and restores its history-entry selection on traversal", () => {
  const env = environment({ home: false });
  const incoming = page();
  env.doc.dispatchEvent(Object.assign(new Event("astro:before-swap"), { newDocument: incoming.doc, navigationType: "push" }));
  assert.equal(incoming.grid.replacements, 1);
  env.doc.root = incoming.root;
  env.history.state = { index: 1, unrelated: 42 };
  env.doc.dispatchEvent(new Event("astro:after-swap"));
  const saved = env.history.state.bbaHomeProjects, selected = ids(incoming.grid);

  const work = page({ home: false });
  env.doc.dispatchEvent(Object.assign(new Event("astro:before-swap"), { newDocument: work.doc, navigationType: "push" }));
  assert.equal(env.timers.size, 0);
  env.doc.root = undefined;
  env.doc.dispatchEvent(new Event("astro:after-swap"));
  const returning = page();
  env.history.state = { index: 1, bbaHomeProjects: saved };
  const calls = env.randomCalls();
  env.doc.dispatchEvent(Object.assign(new Event("astro:before-swap"), { newDocument: returning.doc, navigationType: "traverse" }));
  assert.deepEqual(ids(returning.grid), selected);
  assert.equal(env.randomCalls(), calls);
});

test("reloads select afresh, native history restores IDs, and pending Router history is never replaced prematurely", () => {
  const first = environment(); first.initialise();
  const saved = first.history.state.bbaHomeProjects;
  const back = environment({ navigation: "back_forward", history: { index: 0, bbaHomeProjects: saved } }); back.initialise();
  assert.deepEqual(ids(back.grid), ids(first.grid));
  assert.equal(back.randomCalls(), 0);
  const reload = environment({ seed: 99, navigation: "reload", history: { index: 0, bbaHomeProjects: saved } }); reload.initialise();
  assert.ok(reload.randomCalls() > 0);
  const pending = environment({ history: null }); pending.initialise();
  assert.equal(pending.history.state, null);
  pending.history.state = { index: 0 };
  pending.doc.dispatchEvent(new Event("astro:page-load"));
  assert.equal(pending.history.state.bbaHomeProjects.media.length, 6);
});

test("postcode repetition is relaxed only when needed, while project identities remain unique", () => {
  const limited = [...postcodes.slice(0, 8), ...Array.from({ length: 6 }, (_, i) => ({ _id: `limited-${i}`, postCode: "PE2" }))];
  const env = environment({ postcodes: limited }); env.initialise();
  assert.equal(env.grid.replacements, 1);
  assert.equal(new Set(ids(env.grid)).size, 12);
});

test("missing or malformed pools and stale history fail open to an unchanged, usable editorial fallback", () => {
  for (const options of [{ mediaCount: 5 }, { malformed: true }, { postcodes: postcodes.slice(0, 8) }]) {
    const env = environment(options), original = [...env.grid.children]; env.initialise();
    assert.deepEqual(env.grid.children, original);
    assert.equal(env.grid.replacements, 0);
    assert.equal(env.attributes.has("data-home-grid-pending"), false);
    assert.ok(env.grid.querySelectorAll("[data-project-tile]").every((tile) => !tile.classList.contains("opacity-0")));
  }
  const stale = environment({ navigation: "back_forward", history: { index: 0, bbaHomeProjects: { media: ["removed"], postcodes: [] } } });
  stale.initialise();
  assert.equal(stale.grid.replacements, 1);
});

test("pagehide cancels reveal work and a bfcache restore resumes without changing the selected projects", () => {
  const env = environment(); env.initialise();
  const selected = ids(env.grid);
  env.window.dispatchEvent(new Event("pagehide"));
  assert.equal(env.timers.size, 0);
  env.window.dispatchEvent(new Event("pageshow"));
  assert.deepEqual(ids(env.grid), selected);
  assert.equal(env.grid.replacements, 1);
  env.flushTimers(); env.flushFrames();
  assert.ok(env.grid.querySelectorAll("[data-project-tile]").every((tile) => tile.classList.contains("opacity-100")));
});
