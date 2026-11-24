import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { landingEntryDelay, setupVisitorLanding } from "./visitor-landing.ts";

const sessionScript = readFileSync(new URL("./landing-session.js", import.meta.url), "utf8");
function session(options: { path?: string; hash?: string; navigation?: string; entered?: boolean; blocked?: boolean; pendingRouter?: boolean; historyEntered?: boolean; persistent?: Map<string, string>; legacySession?: boolean } = {}) {
  const attributes = new Map<string, string>();
  const listeners = new Map<string, (event: any) => void>();
  const values = options.persistent ?? new Map(options.entered ? [["bba-landing-entered", "1"]] : []);
  const sessionValues = new Map(options.legacySession ? [["bba-landing-entered", "1"]] : []);
  const history = { state: (options.pendingRouter ? null : { index: 0, scrollX: 0, scrollY: 0, bbaLandingEntered: options.historyEntered, unrelated: 42 }) as any, replaceState(value: any) { this.state = value; } };
  const storage = {
    getItem(key: string) { if (options.blocked) throw new Error("Storage unavailable"); return values.get(key); },
    setItem(key: string, value: string) { if (options.blocked) throw new Error("Storage unavailable"); values.set(key, value); },
  };
  const window: any = {};
  const document = {
    documentElement: {
      toggleAttribute(key: string, value: boolean) { if (value) attributes.set(key, ""); else attributes.delete(key); },
      setAttribute(key: string, value: string) { attributes.set(key, value); },
    },
    addEventListener(name: string, callback: (event: any) => void) { listeners.set(name, callback); },
  };
  const context = { window, document, history, localStorage: storage, sessionStorage: {
    getItem(key: string) { if (options.blocked) throw new Error("Storage unavailable"); return sessionValues.get(key); },
    setItem(key: string, value: string) { if (options.blocked) throw new Error("Storage unavailable"); sessionValues.set(key, value); },
  }, location: { pathname: options.path || "/", hash: options.hash || "" }, performance: { getEntriesByType: () => [{ type: options.navigation || "navigate" }] } };
  const run = () => runInNewContext(sessionScript, context);
  run();
  return { context, window, history, values, listeners, attributes, run, showing: () => attributes.has("data-bba-landing") };
}

test("first entry is persisted so a newly opened browser session skips the intro before paint", () => {
  const env = session();
  assert.equal(env.showing(), true);
  assert.equal(env.values.size, 0);
  assert.equal(env.window.__bbaLanding.entered, false);
  env.run();
  assert.equal(env.showing(), true);
  env.window.__bbaLanding.enter();
  assert.equal(env.values.get("bba-landing-entered"), "1");
  env.run();
  assert.equal(env.showing(), false);
  assert.equal(session({ persistent: env.values }).showing(), false);
  assert.equal(session().showing(), true);
});

test("an existing session-only entry is migrated to the persistent flag", () => {
  const env = session({ legacySession: true });
  assert.equal(env.showing(), false);
  assert.equal(env.values.get("bba-landing-entered"), "1");
});

test("refresh and history navigation skip a dismissed introduction", () => {
  assert.equal(session({ entered: true, navigation: "reload" }).showing(), false);
  assert.equal(session({ navigation: "back_forward" }).showing(), false);
  assert.equal(session({ historyEntered: true, blocked: true, navigation: "reload" }).showing(), false);
  assert.equal(session({ hash: "#content" }).showing(), false);
});

test("direct internal routes are normal visits and returning home does not interrupt them", () => {
  for (const path of ["/work", "/work/copper-house", "/studio", "/insights", "/contact"]) {
    const env = session({ path });
    assert.equal(env.showing(), false);
    env.context.location.pathname = "/";
    env.run();
    assert.equal(env.showing(), false);
  }
});

test("unavailable storage is harmless and history/memory still remember entry", () => {
  const env = session({ blocked: true });
  assert.equal(env.showing(), true);
  assert.doesNotThrow(() => env.window.__bbaLanding.enter());
  assert.equal(env.history.state.bbaLandingEntered, true);
  assert.equal(env.history.state.unrelated, 42);
  env.run();
  assert.equal(env.showing(), false);
});

test("the pre-paint session check preserves Astro's initial history setup", () => {
  const env = session({ path: "/work", pendingRouter: true });
  assert.equal(env.history.state, null);
  env.history.state = { index: 0, scrollX: 0, scrollY: 0 };
  env.listeners.get("astro:page-load")!({});
  assert.equal(env.history.state.index, 0);
  assert.equal(env.history.state.bbaLandingEntered, true);
});

test("client navigation never carries an open landing state into the next document", () => {
  const env = session();
  const incoming = new Set(["data-bba-landing"]);
  env.listeners.get("astro:before-swap")!({ newDocument: { documentElement: { removeAttribute(name: string) { incoming.delete(name); } } } });
  assert.equal(incoming.size, 0);
  env.run();
  assert.equal(env.showing(), false);
});

class Element extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  nodes = new Map<string, Element>();
  buttons: Element[] = [];
  classes = new Set<string>();
  classList = { add: (name: string) => this.classes.add(name) };
  properties = new Map<string, string>();
  style = { setProperty: (name: string, value: string) => this.properties.set(name, value) };
  tagName = "DIV";
  hidden = false;
  inert = false;
  isConnected = true;
  querySelector(selector: string) { return this.nodes.get(selector) || null; }
  querySelectorAll() { return this.buttons; }
  closest(selector: string) { return selector === "button" && this.tagName === "BUTTON" ? this : null; }
  hasAttribute(name: string) { return this.attributes.has(name); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  focus() { (document as any).activeElement = this; }
  remove() { this.isConnected = false; }
}
function overlay(reduced = false) {
  const root = new Element(), landing = new Element(), entry = new Element(), playback = new Element(), main = new Element(), header = new Element(), heading = new Element(), body = new Element();
  header.inert = true; // Restore pre-existing inert state, not just false for every sibling.
  const document = Object.assign(new EventTarget(), { documentElement: root, activeElement: body, body: Object.assign(body, { children: [landing, header, main] }), querySelector: (selector: string) => ({ "[data-bba-landing-overlay]": landing, "main h1": heading })[selector] || null });
  const window = Object.assign(new EventTarget(), { __bbaLanding: { entered: false, enter() { this.entered = true; } } });
  entry.tagName = playback.tagName = "BUTTON";
  root.setAttribute("data-bba-landing", "open");
  landing.nodes.set("[data-landing-entry]", entry);
  landing.buttons = [playback, entry];
  for (const [key, value] of Object.entries({ document, window, HTMLElement: Element, matchMedia: () => ({ matches: reduced }) })) Object.defineProperty(globalThis, key, { configurable: true, value });
  const key = (name: string, shiftKey = false) => {
    const event = Object.assign(new Event("keydown", { cancelable: true }), { key: name, shiftKey });
    landing.dispatchEvent(event);
    return event;
  };
  setupVisitorLanding();
  return { root, landing, entry, playback, main, header, heading, document, window, key };
}

test("opening focuses the entry button, makes the homepage inert, and traps Tab in the overlay", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  assert.equal(env.main.inert, true);
  assert.equal(env.document.activeElement, env.entry);
  assert.equal(env.window.__bbaLanding.entered, false);
  assert.equal(env.landing.isConnected, true);
  assert.equal(env.key("Tab").defaultPrevented, true);
  assert.equal(env.document.activeElement, env.playback);
  assert.equal(env.key("Tab", true).defaultPrevented, true);
  assert.equal(env.document.activeElement, env.entry);
  env.document.dispatchEvent(new Event("astro:before-swap"));
});

test("clicking enters immediately and cancels automatic entry while retaining the existing fade", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  t.mock.timers.tick(500);
  env.entry.dispatchEvent(new Event("click"));
  assert.equal(env.window.__bbaLanding.entered, true);
  t.mock.timers.tick(310);
  assert.equal(env.landing.isConnected, false);
  assert.equal(env.root.hasAttribute("data-bba-landing"), false);
  assert.equal(env.main.inert, false);
  assert.equal(env.header.inert, true);
  assert.equal(env.document.activeElement, env.heading);
  assert.equal(env.heading.getAttribute("tabindex"), null);
  env.document.activeElement = env.playback;
  t.mock.timers.tick(landingEntryDelay);
  assert.equal(env.document.activeElement, env.playback);
});

test("one automatic timer starts with the CSS progress and enters at 3.5 seconds", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  setupVisitorLanding(); // A repeated Astro setup must not add another timer.
  assert.equal(env.landing.properties.get("--landing-entry-delay"), `${landingEntryDelay}ms`);
  assert.equal(env.landing.hasAttribute("data-landing-active"), true);
  t.mock.timers.tick(landingEntryDelay - 1);
  assert.equal(env.landing.isConnected, true);
  assert.equal(env.window.__bbaLanding.entered, false);
  t.mock.timers.tick(1);
  assert.equal(env.window.__bbaLanding.entered, true);
  assert.equal(env.landing.classes.has("is-exiting"), true);
  assert.equal(env.root.getAttribute("data-bba-landing"), "leaving");
  assert.equal(env.landing.isConnected, true);
  t.mock.timers.tick(310);
  assert.equal(env.landing.isConnected, false);
  assert.equal(env.document.activeElement, env.heading);
});

test("native Enter/Space activation remains available and Escape also enters", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const key of ["Enter", " ", "Escape"]) {
    const env = overlay();
    const event = env.key(key);
    if (key !== "Escape") {
      assert.equal(event.defaultPrevented, false); // The semantic button supplies its native click.
      env.entry.dispatchEvent(new Event("click"));
    }
    assert.equal(env.window.__bbaLanding.entered, true);
    t.mock.timers.tick(310);
    assert.equal(env.main.inert, false);
  }
});

test("clicking the artwork enters through the same dismissal path", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  env.landing.dispatchEvent(new Event("click"));
  assert.equal(env.window.__bbaLanding.entered, true);
  t.mock.timers.tick(310);
  assert.equal(env.landing.isConnected, false);
});

test("video playback controls do not dismiss the landing screen", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  const event = new Event("click");
  Object.defineProperty(event, "target", { value: env.playback });
  env.landing.dispatchEvent(event);
  assert.equal(env.window.__bbaLanding.entered, false);
  assert.equal(env.landing.isConnected, true);
  env.document.dispatchEvent(new Event("astro:before-swap"));
});

test("reduced motion skips the wait, progress animation and fade, restoring focus immediately", () => {
  const env = overlay(true);
  assert.equal(env.window.__bbaLanding.entered, true);
  assert.equal(env.landing.hasAttribute("data-landing-active"), false);
  assert.equal(env.landing.isConnected, false);
  assert.equal(env.document.activeElement, env.heading);
  assert.equal(env.main.inert, false);
});

test("navigation before automatic entry cancels the countdown and restores background interaction", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  env.document.dispatchEvent(new Event("astro:before-swap"));
  t.mock.timers.tick(landingEntryDelay + 310);
  assert.equal(env.window.__bbaLanding.entered, false);
  assert.equal(env.main.inert, false);
  assert.equal(env.landing.isConnected, false);
  assert.notEqual(env.document.activeElement, env.heading);
});

test("navigation during dismissal cancels delayed focus and restores background state", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  env.entry.dispatchEvent(new Event("click"));
  env.document.dispatchEvent(new Event("astro:before-swap"));
  t.mock.timers.tick(1000);
  assert.equal(env.landing.isConnected, false);
  assert.equal(env.main.inert, false);
  assert.notEqual(env.document.activeElement, env.heading);
});

test("a back/forward cache entry cancels the countdown and retains a usable homepage", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const env = overlay();
  env.window.dispatchEvent(new Event("pagehide"));
  assert.equal(env.landing.isConnected, false);
  assert.equal(env.main.inert, false);
  assert.equal(env.window.__bbaLanding.entered, true);
  t.mock.timers.tick(landingEntryDelay + 310);
  assert.notEqual(env.document.activeElement, env.heading);
});
