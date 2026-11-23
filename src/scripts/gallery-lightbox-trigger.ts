import type PhotoSwipeLightbox from "photoswipe/lightbox";

// Shared lazy loading and teardown for the scrolling and editorial galleries.
export function attachGalleryLightbox(gallery: HTMLElement, signal: AbortSignal) {
  let lightbox: PhotoSwipeLightbox | undefined;
  let opening = false;
  gallery.addEventListener("click", async (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[data-gallery-image]");
    if (!anchor || !gallery.contains(anchor)) return;
    anchor.focus({ preventScroll: true });
    if (lightbox) return;
    event.preventDefault();
    if (opening) return;
    opening = true;
    const index = Array.from(gallery.querySelectorAll("a[data-gallery-image]")).indexOf(anchor);
    try {
      const { createGalleryLightbox } = await import("./gallery-lightbox");
      if (signal.aborted || !gallery.isConnected) return;
      lightbox = createGalleryLightbox(gallery);
      lightbox.loadAndOpen(index, { gallery });
    } catch {
      if (!signal.aborted && gallery.isConnected) window.location.assign(anchor.href);
    } finally {
      opening = false;
    }
  }, { signal });
  return () => lightbox?.destroy();
}
