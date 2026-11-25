import assert from "node:assert/strict";
import test from "node:test";
import type PhotoSwipe from "photoswipe";
import { galleryTapAction } from "./gallery-lightbox-actions.ts";

function tap(className: string, interactive = false) {
  const calls: string[] = [];
  const lightbox = {
    close: () => calls.push("close"),
    element: { classList: { toggle: (name: string) => calls.push(name) } },
  };
  const target = {
    classList: { contains: (name: string) => name === className },
    closest: () => interactive ? target : null,
  };
  galleryTapAction.call(lightbox as unknown as PhotoSwipe, { x: 20, y: 30 }, { target } as unknown as PointerEvent);
  return calls;
}

test("mobile taps on the dark viewport surrounding the photograph close the lightbox", () => {
  for (const target of ["pswp__item", "pswp__zoom-wrap", "pswp__bg", "pswp__scroll-wrap"]) {
    assert.deepEqual(tap(target), ["close"]);
  }
});

test("navigation and magnifier controls retain their actions without backdrop dismissal", () => {
  for (const control of ["pswp__button--arrow--next", "pswp__button--arrow--prev", "pswp__button--zoom", "pswp__button--close"]) {
    assert.deepEqual(tap(control, true), []);
  }
  assert.deepEqual(tap("pswp__bba-caption", true), []);
});

test("tapping the photograph retains PhotoSwipe's existing controls toggle", () => {
  assert.deepEqual(tap("pswp__img"), ["pswp--ui-visible"]);
});
