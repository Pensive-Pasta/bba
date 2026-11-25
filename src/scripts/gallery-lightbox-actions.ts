import type PhotoSwipe from "photoswipe";

// PhotoSwipe recognises taps separately from swipes and pinch gestures. Keep
// its normal image-tap behaviour, but dismiss when the surrounding shade is tapped.
export function galleryTapAction(this: PhotoSwipe, _point: { x: number; y: number }, event: PointerEvent) {
  const target = event.target as Element | null;
  if (!target || target.closest("button, a, [role='button'], .pswp__button, .pswp__bba-caption")) return;
  if (target.classList.contains("pswp__img")) {
    this.element?.classList.toggle("pswp--ui-visible");
  } else {
    this.close();
  }
}
