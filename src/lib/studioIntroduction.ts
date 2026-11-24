import type { PortableTextBlock } from "@portabletext/types";
import { isRenderable } from "./contentBlocks.ts";

interface StudioBlock {
  _type: string;
  content?: PortableTextBlock[];
}

// Only a leading run of text can move without changing CMS text/media order.
// A media-first section keeps its entire body, including text following media.
export function studioIntroduction(blocks: StudioBlock[] | null | undefined, heading: string) {
  const visible = (blocks ?? []).filter(isRenderable);
  const firstMedia = visible.findIndex((block) => block._type !== "textBlock");
  const startIndex = firstMedia === -1 ? visible.length : firstMedia;
  const introduction = visible.slice(0, startIndex);
  const firstParagraph = introduction.flatMap((block) => block.content ?? [])
    .find((block) => block._type === "block" && block.children?.some((span) => span.text?.trim()));
  const firstText = firstParagraph?.children?.map((span) => span.text ?? "").join("").trim();
  const hasHeading = /^h[1-6]$/.test(firstParagraph?.style ?? "") &&
    firstText?.toLowerCase() === heading.toLowerCase();

  return { introduction, body: visible.slice(startIndex), startIndex, hasHeading };
}
