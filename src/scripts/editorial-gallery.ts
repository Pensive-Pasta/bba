import { attachGalleryLightbox } from "./gallery-lightbox-trigger";

class BbaEditorialGallery extends HTMLElement {
  private controller?: AbortController;
  private cleanupLightbox?: () => void;

  connectedCallback() {
    if (this.controller) return;
    this.controller = new AbortController();
    this.cleanupLightbox = attachGalleryLightbox(this, this.controller.signal);
  }

  disconnectedCallback() {
    this.controller?.abort();
    this.controller = undefined;
    this.cleanupLightbox?.();
    this.cleanupLightbox = undefined;
  }
}

if (!customElements.get("bba-editorial-gallery")) customElements.define("bba-editorial-gallery", BbaEditorialGallery);
