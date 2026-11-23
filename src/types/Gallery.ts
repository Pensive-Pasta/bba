export interface GalleryImage {
  _key?: string;
  altText?: string | null;
  caption?: string | null;
  editorialLayout?: "auto" | "full" | "half" | "portrait-stack" | null;
  crop?: { left?: number; right?: number; top?: number; bottom?: number } | null;
  hotspot?: { x?: number; y?: number; width?: number; height?: number } | null;
  asset?: {
    url?: string;
    metadata?: { dimensions?: { width?: number; height?: number } };
  } | null;
}

export interface GalleryBlock {
  _type: "galleryBlock";
  _key: string;
  heading?: string | null;
  presentation?: "scroll" | "editorial" | null;
  images?: Array<GalleryImage | null> | null;
}
