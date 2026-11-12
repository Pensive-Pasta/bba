import { gallerySlides } from "./gallery.ts";

// Unknown/unfinished CMS blocks should not leave empty sections in the page.
export const isRenderable = (block: any): boolean =>
  (block?._type === "galleryBlock" && gallerySlides(block.images).length > 0) ||
  (block?._type === "imageBlock" &&
    Array.isArray(block.images) && block.images.some((image: any) => image?.asset?.url)) ||
  (block?._type === "textBlock" && Array.isArray(block.content) &&
    block.content.some((item: any) => Array.isArray(item?.children) &&
      item.children.some((span: any) => typeof span?.text === "string" && span.text.trim().length > 0)));
