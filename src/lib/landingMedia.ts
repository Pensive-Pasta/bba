import { heroImage, heroVideos } from "./heroMedia.ts";
import type { HeroImage, HeroVideo } from "../types/HeroMedia";

export interface LandingContent {
  landingHeading?: string | null;
  landingText?: string | null;
  heroImage?: HeroImage | null;
  heroVideo?: HeroVideo | null;
  mobileHeroImage?: HeroImage | null;
  mobileHeroVideo?: HeroVideo | null;
  landingFallbackProject?: {
    title?: string;
    postCode?: string;
    heroImage?: HeroImage | null;
  } | null;
}

const imageWidths = [480, 768, 1024, 1440, 1920, 2560];
function usableImage(image?: HeroImage | null) {
  try { return image?.asset?.url && /^https?:$/.test(new URL(image.asset.url).protocol) ? image : undefined; }
  catch { return undefined; }
}

// Reuse hero crop/hotspot handling, then request responsive hero-sized images,
// never the square listing thumbnail or an unbounded original download.
function prepareImage(image?: HeroImage | null) {
  if (!image) return { url: "/images/copper.jpg", srcset: undefined, position: "50% 50%", alt: "Copper House, Butcher Bayley Architects" };
  const resolved = heroImage(image);
  const url = new URL(resolved.url);
  if (url.hostname !== "cdn.sanity.io" || !url.pathname.startsWith("/images/")) {
    return { ...resolved, srcset: undefined, alt: image.altText || "Architecture by Butcher Bayley Architects" };
  }
  const rectWidth = Number(url.searchParams.get("rect")?.split(",")[2]);
  const nativeWidth = rectWidth || image.asset?.metadata?.dimensions?.width || 2560;
  const maximum = Math.max(1, Math.min(2560, nativeWidth));
  const imageUrl = (width: number) => {
    const sized = new URL(url);
    sized.searchParams.set("w", String(width));
    sized.searchParams.set("fit", "max");
    sized.searchParams.set("auto", "format");
    sized.searchParams.set("q", "80");
    return sized.toString();
  };
  const widths = [...imageWidths.filter((width) => width < maximum), maximum];
  return {
    url: imageUrl(Math.min(1920, maximum)),
    srcset: widths.map((width) => `${imageUrl(width)} ${width}w`).join(", "),
    position: resolved.position,
    alt: image.altText || "Architecture by Butcher Bayley Architects",
  };
}

export function landingMedia(content: LandingContent | null | undefined) {
  const fallback = usableImage(content?.landingFallbackProject?.heroImage);
  const configuredImage = usableImage(content?.heroImage);
  const mobileImage = usableImage(content?.mobileHeroImage);
  const desktop = prepareImage(configuredImage || fallback);
  const mobile = mobileImage ? prepareImage(mobileImage) : desktop;
  const videos = heroVideos(content?.heroVideo, content?.mobileHeroVideo, Boolean(mobileImage));
  const hasConfiguredMedia = Boolean(configuredImage || mobileImage || videos.desktop || videos.mobile);
  return {
    desktop,
    mobile,
    videos,
    fallbackProject: !hasConfiguredMedia && fallback ? content?.landingFallbackProject : undefined,
    heading: content?.landingHeading?.trim() || "Progressive places\nfor living, working,\nlearning and community.",
    text: content?.landingText?.trim() || "",
  };
}
