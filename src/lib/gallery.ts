import type { GalleryImage } from "../types/Gallery.ts";
import { imageAlt } from "./imageAlt.ts";

const THUMBNAIL_WIDTHS = [240, 480, 768, 1024, 1440];
const LIGHTBOX_MAX_EDGE = 2560;

export interface GallerySlide {
  alt: string;
  caption: string;
  width: number;
  height: number;
  thumbnail: string;
  srcset: string;
  lightbox: string;
  lightboxSrcset: string;
  lightboxWidth: number;
  lightboxHeight: number;
}

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 1;

export function gallerySlide(image: GalleryImage | null | undefined): GallerySlide | undefined {
  const dimensions = image?.asset?.metadata?.dimensions;
  if (!image?.asset?.url || !positive(dimensions?.width) || !positive(dimensions?.height)) return;

  let url: URL;
  try {
    url = new URL(image.asset.url);
  } catch {
    return;
  }
  if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io" || !url.pathname.startsWith("/images/")) return;
  url.search = "";

  const originalWidth = Math.round(dimensions.width);
  const originalHeight = Math.round(dimensions.height);
  let width = originalWidth;
  let height = originalHeight;
  const crop = image.crop;
  if (crop) {
    const edges = [crop.left ?? 0, crop.right ?? 0, crop.top ?? 0, crop.bottom ?? 0];
    if (edges.every((edge) => Number.isFinite(edge) && edge >= 0 && edge < 1)) {
      const [left, right, top, bottom] = edges;
      if (left + right < 1 && top + bottom < 1 && edges.some(Boolean)) {
        const x = Math.min(originalWidth - 1, Math.round(left * originalWidth));
        const y = Math.min(originalHeight - 1, Math.round(top * originalHeight));
        width = Math.max(1, Math.min(originalWidth - x, Math.round(originalWidth * (1 - left - right))));
        height = Math.max(1, Math.min(originalHeight - y, Math.round(originalHeight * (1 - top - bottom))));
        url.searchParams.set("rect", `${x},${y},${width},${height}`);
      }
    }
  }
  // A hotspot only guides an aspect-ratio crop. This gallery never imposes one.
  const imageUrl = (requestedWidth: number) => {
    const sized = new URL(url);
    sized.searchParams.set("w", String(Math.min(width, requestedWidth)));
    sized.searchParams.set("fit", "max");
    sized.searchParams.set("auto", "format");
    sized.searchParams.set("q", "80");
    return sized.toString();
  };
  const srcset = (widths: number[]) => [...new Set(widths)].sort((a, b) => a - b)
    .map((candidate) => `${imageUrl(candidate)} ${candidate}w`).join(", ");

  const lightboxWidth = Math.max(1, Math.floor(width * Math.min(1, LIGHTBOX_MAX_EDGE / Math.max(width, height))));
  const lightboxHeight = Math.max(1, Math.round(height * lightboxWidth / width));
  const thumbnailWidth = Math.min(width, 1440, lightboxWidth);
  return {
    alt: imageAlt(image),
    caption: text(image.caption),
    width,
    height,
    thumbnail: imageUrl(Math.min(thumbnailWidth, 768)),
    srcset: srcset([...THUMBNAIL_WIDTHS.filter((candidate) => candidate < thumbnailWidth), thumbnailWidth]),
    lightbox: imageUrl(lightboxWidth),
    lightboxSrcset: srcset([...THUMBNAIL_WIDTHS.filter((candidate) => candidate < lightboxWidth), lightboxWidth]),
    lightboxWidth,
    lightboxHeight,
  };
}

export function gallerySlides(images: unknown): GallerySlide[] {
  if (!Array.isArray(images)) return [];
  return images.map((image) => gallerySlide(image)).filter((slide): slide is GallerySlide => Boolean(slide));
}
