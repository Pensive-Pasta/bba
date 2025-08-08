import type { PortableTextBlock } from "@portabletext/types";

export interface ImageBlockImage {
  altText?: string;
  caption?: string;
  size?: string;
  asset: {
    url: string;
  };
}

export interface ImageBlock {
  _type: "imageBlock";
  _key: string;
  images: ImageBlockImage[];
}

export interface TextBlock {
  _type: "textBlock";
  _key: string;
  content: any;
}

export type ContentBlock = ImageBlock | TextBlock;

export interface Person {
  name?: string;
  position?: string;
  bio?: string;
  socialLink?: string;
  email?: string;
  image?: {
    url: string;
    alt?: string;
  };
}

export interface StudioPage {
  profileBlocks: ContentBlock[];
  valuesBlocks: ContentBlock[];
  awardsBlocks: ContentBlock[];
  peopleIntro: PortableTextBlock[];
  people: Person[];
}