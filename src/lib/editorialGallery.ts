import { gallerySlide, type GallerySlide } from "./gallery.ts";
import type { GalleryImage } from "../types/Gallery.ts";

export interface EditorialArrangement {
  layout: "full" | "columns" | "portrait-stack";
  slides: GallerySlide[];
}

// A single ordered sequence; only adjacent images can share an arrangement.
// Editors can override these simple defaults without changing image order.
export function editorialArrangements(images: Array<GalleryImage | null> | null | undefined): EditorialArrangement[] {
  const entries = (images ?? []).flatMap((image) => {
    const slide = gallerySlide(image);
    return slide ? [{ slide, layout: image?.editorialLayout ?? "auto" }] : [];
  });
  const full = (entry: typeof entries[number]) =>
    entry.layout === "full" || (entry.layout === "auto" && entry.slide.width / entry.slide.height >= 2);
  const groups: EditorialArrangement[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const next = entries[index + 1];
    const third = entries[index + 2];
    if (full(entry)) {
      groups.push({ layout: "full", slides: [entry.slide] });
    } else if (entry.layout === "portrait-stack" && next && third &&
      !full(next) && !full(third) && next.layout !== "portrait-stack" && third.layout !== "portrait-stack") {
      groups.push({ layout: "portrait-stack", slides: [entry.slide, next.slide, third.slide] });
      index += 2;
    } else if (next && !full(next) && next.layout !== "portrait-stack") {
      groups.push({ layout: "columns", slides: [entry.slide, next.slide] });
      index++;
    } else {
      groups.push({ layout: "columns", slides: [entry.slide] });
    }
  }
  return groups;
}
