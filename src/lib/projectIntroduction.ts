import type { PortableTextBlock } from "@portabletext/types";
import { isRenderable } from "./contentBlocks.ts";

export interface ProjectContentBlock {
  _type: string;
  _key?: string;
  content?: PortableTextBlock[];
  [key: string]: unknown;
}

// Move only leading text. Text following photographs keeps its editorial
// position, and the remaining blocks retain their original alignment parity.
export function projectIntroduction(blocks: ProjectContentBlock[] | null | undefined) {
  const visible = (blocks ?? []).filter(isRenderable);
  const firstMedia = visible.findIndex((block) => block._type !== "textBlock");
  const startIndex = firstMedia === -1 ? visible.length : firstMedia;
  return {
    introduction: visible.slice(0, startIndex),
    body: visible.slice(startIndex),
    startIndex,
  };
}
