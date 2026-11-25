export interface HeroImage {
  altText?: string;
  decorative?: boolean;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  hotspot?: { x: number; y: number } | null;
  asset?: {
    altText?: string;
    url?: string;
    metadata?: { dimensions?: { width: number; height: number } };
  } | null;
}

export interface HeroVideo {
  url?: string;
  mimeType?: string;
}
