import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { attachGalleryLightbox } from "./gallery-lightbox-trigger.ts";

// Replace only the browser library boundary, exercising the actual event handler
// and lazy initialisation with the same ordered links used by either layout.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "./gallery-lightbox" && context.parentURL?.endsWith("/gallery-lightbox-trigger.ts")) {
      return { url: "data:text/javascript,export const createGalleryLightbox = (gallery) => globalThis.__testGalleryLightbox(gallery)", shortCircuit: true };
    }
    return next(specifier, context);
  },
});

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture() {
  const calls: unknown[][] = [];
  const links = Array.from({ length: 9 }, (_, index) => ({
    href: `https://example.com/image-${index}.jpg`,
    focus: () => calls.push(["focus", index]),
  }));
  const gallery = new EventTarget() as EventTarget & {
    isConnected: boolean;
    querySelectorAll: () => typeof links;
    contains: (link: unknown) => boolean;
  };
  gallery.isConnected = true;
  gallery.querySelectorAll = () => links;
  gallery.contains = (link) => links.includes(link as typeof links[number]);
  (globalThis as any).__testGalleryLightbox = (target: unknown) => {
    calls.push(["create", target]);
    return { loadAndOpen: (index: number, source: unknown) => calls.push(["open", index, source]), destroy: () => calls.push(["destroy"]) };
  };
  const click = (index: number, options: Record<string, unknown> = {}) => {
    const event = new Event("click", { cancelable: true });
    Object.defineProperty(event, "target", { value: { closest: () => links[index] } });
    for (const [key, value] of Object.entries({ button: 0, ...options })) Object.defineProperty(event, key, { value });
    gallery.dispatchEvent(event);
    return event;
  };
  const controller = new AbortController();
  const cleanup = attachGalleryLightbox(gallery as unknown as HTMLElement, controller.signal);
  return { calls, links, gallery, click, controller, cleanup };
}

test("either gallery opens the clicked editorial index within one complete lightbox sequence", async () => {
  // Every image, including nested stacked images and the last image, can open.
  for (let index = 0; index < 9; index++) {
    const f = fixture();
    assert.equal(f.click(index).defaultPrevented, true);
    await settle();
    assert.deepEqual(f.calls.find(([type]) => type === "open"), ["open", index, { gallery: f.gallery }]);
    assert.equal(f.gallery.querySelectorAll().length, 9);
    assert.equal(f.calls.filter(([type]) => type === "create").length, 1);
    // Later clicks are handled by PhotoSwipe's own listener.
    assert.equal(f.click(index).defaultPrevented, false);
    f.controller.abort();
    f.cleanup();
    assert.equal(f.calls.filter(([type]) => type === "destroy").length, 1);
  }
});

test("modified image clicks keep ordinary link behaviour and Astro disconnect cancels pending initialisation", async () => {
  const f = fixture();
  assert.equal(f.click(0, { metaKey: true }).defaultPrevented, false);
  assert.equal(f.click(0, { ctrlKey: true }).defaultPrevented, false);
  assert.equal(f.click(0, { button: 1 }).defaultPrevented, false);
  assert.equal(f.calls.length, 0);
  f.click(2);
  f.controller.abort();
  f.cleanup();
  await settle();
  assert.equal(f.calls.some(([type]) => type === "create" || type === "open"), false);
  f.click(3);
  assert.equal(f.calls.length, 1); // Only the focus from the initial click.
});
