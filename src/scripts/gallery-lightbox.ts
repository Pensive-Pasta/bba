import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import "../styles/gallery-lightbox.css";
import { galleryTapAction } from "./gallery-lightbox-actions";

const captionText = (element?: HTMLElement) =>
  element?.closest("figure")?.querySelector("figcaption")?.textContent?.trim() || "";

export function createGalleryLightbox(gallery: HTMLElement) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: "a[data-gallery-image]",
    pswpModule: () => import("photoswipe"),
    preload: [1, 1],
    loop: false,
    bgClickAction: "close",
    tapAction: galleryTapAction,
    showAnimationDuration: reducedMotion ? 0 : 200,
    hideAnimationDuration: reducedMotion ? 0 : 200,
    zoomAnimationDuration: reducedMotion ? 0 : 200,
    paddingFn: (viewport, item) => ({
      top: 48, left: 16, right: 16,
      bottom: captionText(item.element) ? Math.min(viewport.y * 0.25, 180) + 32 : 32,
    }),
  });
  lightbox.on("uiRegister", () => {
    lightbox.pswp?.ui?.registerElement({
      name: "bba-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit: (element, pswp) => {
        element.setAttribute("role", "status");
        element.setAttribute("aria-live", "polite");
        element.tabIndex = 0;
        const update = () => {
          element.textContent = captionText(pswp.currSlide?.data.element);
          element.hidden = !element.textContent;
        };
        pswp.on("change", update);
        update();
      },
    });
  });
  lightbox.init();
  return lightbox;
}
