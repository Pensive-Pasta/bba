export interface HeroImage {
  altText?: string;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  hotspot?: { x: number; y: number } | null;
  asset?: {
    url?: string;
    metadata?: { dimensions?: { width: number; height: number } };
  } | null;
}

export interface HeroVideo {
  url?: string;
  mimeType?: string;
}
