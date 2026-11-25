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
  let introduction = visible.slice(0, startIndex);
  const firstParagraph = introduction.flatMap((block) => block.content ?? [])
    .find((block) => block._type === "block" && block.children?.some((span) => span.text?.trim()));
  const firstText = firstParagraph?.children?.map((span) => span.text ?? "").join("").trim();
  const isSectionHeading = /^h[1-6]$/.test(firstParagraph?.style ?? "") &&
    firstText?.toLowerCase() === heading.toLowerCase();

  // The selected tab already names the section. Omit its repeated CMS heading
  // without changing stored content, other headings or body alignment parity.
  if (isSectionHeading) {
    introduction = introduction.map((block) => ({
      ...block,
      content: block.content?.filter((paragraph) => paragraph !== firstParagraph),
    })).filter(isRenderable);
  }

  return { introduction, body: visible.slice(startIndex), startIndex };
}
