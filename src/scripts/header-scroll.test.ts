import assert from "node:assert/strict";
import test from "node:test";
import { initHeaderScroll, initialHeaderScrollState, nextHeaderScrollState } from "./header-scroll.ts";

test("the header stays visible throughout its original document position", () => {
  let state = initialHeaderScrollState();
  for (const y of [10, 40, 90, 100]) state = nextHeaderScrollState(state, y, 100);
  assert.equal(state.hidden, false);
});

test("downward travel past the header hides it and sustained upward travel reveals it", () => {
  let state = nextHeaderScrollState(initialHeaderScrollState(), 200, 100);
  assert.equal(state.hidden, true);
  state = nextHeaderScrollState(state, 196, 100);
  assert.equal(state.hidden, true);
  state = nextHeaderScrollState(state, 192, 100);
  assert.equal(state.hidden, true);
  state = nextHeaderScrollState(state, 188, 100);
  assert.equal(state.hidden, false);
  state = nextHeaderScrollState(state, 180, 100);
  assert.equal(state.hidden, false);
  state = nextHeaderScrollState(state, 195, 100);
  assert.equal(state.hidden, true);
});

test("small direction reversals do not flicker the header", () => {
  let state = nextHeaderScrollState(initialHeaderScrollState(), 200, 100);
  for (const y of [197, 199, 196, 198, 195, 197]) {
    state = nextHeaderScrollState(state, y, 100);
    assert.equal(state.hidden, true);
  }
});

test("top, menu and keyboard focus take precedence over hiding", () => {
  const hidden = nextHeaderScrollState(initialHeaderScrollState(), 500, 100);
  assert.equal(nextHeaderScrollState(hidden, 80, 100).hidden, false);
  assert.equal(nextHeaderScrollState(hidden, -30, 100).hidden, false);
  assert.equal(nextHeaderScrollState(hidden, 550, 100, true).hidden, false);
});

class Header extends EventTarget {
  height = 100;
  focused = false;
  keyboardFocus = true;
  attributes = new Map<string, string>();
  toggle: { expanded: boolean; getAttribute(name: string): string | null } | null = {
    expanded: false,
    getAttribute(name) { return name === "aria-expanded" ? String(this.expanded) : null; },
  };
  getBoundingClientRect() { return { height: this.height }; }
  querySelector(selector: string) {
    if (selector === "#menu-toggle") return this.toggle;
    if (selector === ":focus-visible" && this.focused && this.keyboardFocus) return this.toggle;
    return null;
  }
  contains() { return this.focused; }
  toggleAttribute(name: string, value: boolean) { if (value) this.attributes.set(name, ""); else this.attributes.delete(name); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  get hidden() { return this.attributes.has("data-scroll-hidden"); }
}
class Observer {
  static latest: Observer;
  active = true;
  callback: () => void;
  constructor(callback: () => void) { this.callback = callback; Observer.latest = this; }
  observe() {}
  disconnect() { this.active = false; }
  resize() { if (this.active) this.callback(); }
}
function environment(y = 0, maximum = 2000) {
  const values = new Map<string, string>();
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const window = Object.assign(new EventTarget(), { scrollY: y, innerHeight: 800 });
  const document = Object.assign(new EventTarget(), {
    activeElement: null,
    documentElement: { scrollHeight: maximum + 800, style: { setProperty: (name: string, value: string) => values.set(name, value) } },
  });
  for (const [key, value] of Object.entries({
    window, document, ResizeObserver: Observer,
    requestAnimationFrame: (callback: FrameRequestCallback) => { callbacks.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
  })) Object.defineProperty(globalThis, key, { configurable: true, value });
  const header = new Header();
  const cleanup = initHeaderScroll(header as unknown as HTMLElement);
  const flush = () => { const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach((callback) => callback(0)); };
  const scroll = (position: number) => { window.scrollY = position; window.dispatchEvent(new Event("scroll")); };
  return { header, window, document, callbacks, values, cleanup, flush, scroll };
}

test("scroll events share a frame and the actual bar height supplies the shared CSS offset", () => {
  const env = environment();
  assert.equal(env.values.get("--site-header-height"), "100px");
  env.scroll(150); env.scroll(175); env.scroll(200);
  assert.equal(env.callbacks.size, 1);
  env.flush();
  assert.equal(env.header.hidden, true);
  env.scroll(180); env.flush();
  assert.equal(env.header.hidden, false);
  env.cleanup();
});

test("opening the existing menu reveals the bar and scrolling cannot hide it", () => {
  const env = environment();
  env.scroll(300); env.flush();
  assert.equal(env.header.hidden, true);
  env.header.toggle!.expanded = true;
  env.header.dispatchEvent(new Event("bba:menu-state"));
  assert.equal(env.header.hidden, false);
  env.scroll(500); env.flush();
  assert.equal(env.header.hidden, false);
  env.header.toggle!.expanded = false;
  env.header.dispatchEvent(new Event("bba:menu-state"));
  env.scroll(520); env.flush();
  assert.equal(env.header.hidden, true);
  env.cleanup();
});

test("keyboard focus reveals the bar and keeps focused controls on screen", () => {
  const env = environment();
  env.scroll(300); env.flush();
  env.header.focused = true;
  env.header.dispatchEvent(new Event("focusin"));
  assert.equal(env.header.hidden, false);
  env.scroll(500); env.flush();
  assert.equal(env.header.hidden, false);
  env.cleanup();
});

test("responsive bar height is remeasured without a second header or menu measurement", () => {
  const env = environment();
  env.header.height = 137;
  Observer.latest.resize();
  assert.equal(env.values.get("--site-header-height"), "137px");
  env.scroll(120); env.flush();
  assert.equal(env.header.hidden, false);
  env.header.height = 90;
  env.window.dispatchEvent(new Event("resize"));
  assert.equal(env.values.get("--site-header-height"), "90px");
  env.cleanup();
});

test("restoring a long page starts visible and follows subsequent scroll direction", () => {
  const env = environment(600);
  assert.equal(env.header.hidden, false);
  env.scroll(620); env.flush();
  assert.equal(env.header.hidden, true);
  env.scroll(600); env.flush();
  assert.equal(env.header.hidden, false);
  env.cleanup();
});

test("short pages and elastic overscroll cannot trigger a false hide/reveal", () => {
  const short = environment(0, 60);
  short.scroll(300); short.flush();
  assert.equal(short.header.hidden, false);
  short.cleanup();
  const long = environment(0, 400);
  long.scroll(450); long.flush();
  assert.equal(long.header.hidden, true);
  long.scroll(500); long.flush();
  long.scroll(450); long.flush();
  assert.equal(long.header.hidden, true);
  long.scroll(-20); long.flush();
  assert.equal(long.header.hidden, false);
  long.cleanup();
});

test("navigation cleanup removes observers, pending frames and stale listeners", () => {
  const env = environment();
  env.scroll(300);
  assert.equal(env.callbacks.size, 1);
  env.document.dispatchEvent(new Event("astro:before-swap"));
  assert.equal(env.callbacks.size, 0);
  assert.equal(Observer.latest.active, false);
  env.scroll(500);
  assert.equal(env.callbacks.size, 0);
});

test("pages that intentionally hide the menu still retain header scroll behaviour", () => {
  const env = environment();
  env.header.toggle = null;
  env.scroll(300); env.flush();
  assert.equal(env.header.hidden, true);
  env.scroll(280); env.flush();
  assert.equal(env.header.hidden, false);
  env.cleanup();
});

test("mouse focus left on the closed menu button does not pin the header", () => {
  const env = environment();
  env.scroll(300); env.flush();
  env.header.focused = true;
  env.header.keyboardFocus = false;
  env.header.toggle!.expanded = true;
  env.header.dispatchEvent(new Event("bba:menu-state"));
  env.scroll(500); env.flush();
  assert.equal(env.header.hidden, false);
  env.header.toggle!.expanded = false;
  env.header.dispatchEvent(new Event("bba:menu-state"));
  env.scroll(520); env.flush();
  assert.equal(env.header.focused, true);
  assert.equal(env.header.hidden, true);
  env.cleanup();
});
