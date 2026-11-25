import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

class Element extends EventTarget {
  attributes = new Map<string, string>();
  classes = new Set<string>();
  classList = {
    toggle: (name: string, force = !this.classes.has(name)) => { if (force) this.classes.add(name); else this.classes.delete(name); return force; },
    contains: (name: string) => this.classes.has(name),
  };
  children: Element[] = [];
  focus() { document.activeElement = this; }
  contains(element: Element) { return this.children.includes(element); }
  querySelector() { return this.children[0]; }
  querySelectorAll() { return this.children; }
  getAttribute(name: string) { return this.attributes.get(name) || null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  toggleAttribute(name: string, force: boolean) { if (force) this.attributes.set(name, ""); else this.attributes.delete(name); }
}
let document: any;
function environment(pageInert = false) {
  const toggle = new Element(), menu = new Element(), main = new Element(), footer = new Element();
  toggle.setAttribute("aria-expanded", "false");
  main.toggleAttribute("inert", pageInert);
  menu.classes.add("hidden");
  menu.children = [new Element(), new Element()];
  document = Object.assign(new EventTarget(), {
    readyState: "complete", activeElement: toggle, body: new Element(),
    getElementById: (id: string) => id === "menu-toggle" ? toggle : id === "nav-menu" ? menu : null,
    querySelector: (selector: string) => selector === "main" ? main : selector === "footer" ? footer : null,
  });
  const source = fs.readFileSync(new URL("../components/Header.astro", import.meta.url), "utf8").match(/<script>\s*(const setupMobileMenu[\s\S]*?)<\/script>/)![1];
  vm.runInNewContext(ts.transpile(source, {target: ts.ScriptTarget.ESNext}), {document, window: {}, AbortController, CustomEvent});
  const key = (value: string, shiftKey = false) => { const event = Object.assign(new Event("keydown", {cancelable: true}), {key: value, shiftKey}); document.dispatchEvent(event); return event; };
  return {toggle, menu, main, footer, key};
}

test("opening the menu moves focus into navigation and Escape restores the trigger and page", () => {
  const env = environment();
  env.toggle.dispatchEvent(new Event("click"));
  assert.equal(document.activeElement, env.menu.children[0]);
  assert.equal(env.main.attributes.has("inert"), true);
  assert.equal(env.footer.attributes.has("inert"), true);
  env.key("Escape");
  assert.equal(document.activeElement, env.toggle);
  assert.equal(env.main.attributes.has("inert"), false);
  assert.equal(env.footer.attributes.has("inert"), false);
});

test("initialising a closed menu preserves inert state owned by the visitor introduction", () => {
  const env = environment(true);
  assert.equal(env.main.attributes.has("inert"), true);
});

test("Tab and Shift+Tab wrap inside the open navigation; following a link closes it", () => {
  const env = environment();
  env.toggle.dispatchEvent(new Event("click"));
  env.menu.children.at(-1)!.focus();
  assert.equal(env.key("Tab").defaultPrevented, true);
  assert.equal(document.activeElement, env.toggle);
  assert.equal(env.key("Tab", true).defaultPrevented, true);
  assert.equal(document.activeElement, env.menu.children.at(-1));
  env.menu.children[0].dispatchEvent(new Event("click"));
  assert.equal(env.toggle.getAttribute("aria-expanded"), "false");
});
