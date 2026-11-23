import { attachGalleryLightbox } from "./gallery-lightbox-trigger";
import { galleryScrollTarget } from "./gallery-navigation.ts";

class BbaGallery extends HTMLElement {
  private controller?: AbortController;
  private cleanupLightbox?: () => void;
  private resizeObserver?: ResizeObserver;
  private frame = 0;

  connectedCallback() {
    if (this.controller) return;
    const track = this.querySelector<HTMLElement>("[data-gallery-track]");
    const controls = this.querySelector<HTMLElement>("[data-gallery-controls]");
    const previous = this.querySelector<HTMLButtonElement>("[data-gallery-previous]");
    const next = this.querySelector<HTMLButtonElement>("[data-gallery-next]");
    if (!track || !controls || !previous || !next) return;
    const controller = new AbortController();
    this.controller = controller;
    const { signal } = controller;
    this.cleanupLightbox = attachGalleryLightbox(this, signal);

    const maximum = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const update = () => {
      this.frame = 0;
      const limit = maximum();
      controls.hidden = limit <= 2;
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= limit - 2;
    };
    const scheduleUpdate = () => {
      if (!this.frame) this.frame = requestAnimationFrame(update);
    };
    const navigate = (direction: -1 | 1) => {
      const origin = track.getBoundingClientRect().left;
      const starts = Array.from(track.querySelectorAll<HTMLElement>("[data-gallery-slide]"))
        .map((slide) => slide.getBoundingClientRect().left - origin + track.scrollLeft);
      track.scrollTo({
        left: galleryScrollTarget(starts, track.scrollLeft, maximum(), direction),
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    };
    previous.addEventListener("click", () => navigate(-1), { signal });
    next.addEventListener("click", () => navigate(1), { signal });
    track.addEventListener("scroll", scheduleUpdate, { passive: true, signal });
    track.addEventListener("keydown", (event) => {
      // Leave image links and ordinary page scrolling to the browser.
      if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigate(event.key === "ArrowLeft" ? -1 : 1);
      }
    }, { signal });
    window.addEventListener("resize", scheduleUpdate, { passive: true, signal });
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(scheduleUpdate);
      this.resizeObserver.observe(track);
      track.querySelectorAll("[data-gallery-slide]").forEach((slide) => this.resizeObserver!.observe(slide));
    }
    update();
  }

  disconnectedCallback() {
    this.controller?.abort();
    this.controller = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.cleanupLightbox?.();
    this.cleanupLightbox = undefined;
  }
}

// A custom element connects/disconnects naturally during Astro ClientRouter swaps.
if (!customElements.get("bba-gallery")) customElements.define("bba-gallery", BbaGallery);
