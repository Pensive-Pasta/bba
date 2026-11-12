import type { HeroImage, HeroVideo } from "../types/HeroMedia";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

// Keep legacy URLs untouched unless the editor has supplied a crop.
// Dimensions come from asset metadata, never from the filename.
export function heroImage(image?: HeroImage | null, fallback = "") {
  const original = image?.asset?.url || fallback;
  if (!original) return { url: "", position: "50% 50%" };
  const url = new URL(original);
  const crop = image?.crop;
  const dimensions = image?.asset?.metadata?.dimensions;
  let left = 0, top = 0, width = 1, height = 1;
  if (crop && dimensions && (crop.left || crop.right || crop.top || crop.bottom)) {
    const x = Math.round(crop.left * dimensions.width);
    const y = Math.round(crop.top * dimensions.height);
    const w = Math.max(1, Math.min(dimensions.width - x,
      Math.round((1 - crop.left - crop.right) * dimensions.width)));
    const h = Math.max(1, Math.min(dimensions.height - y,
      Math.round((1 - crop.top - crop.bottom) * dimensions.height)));
    url.searchParams.set("rect", `${x},${y},${w},${h}`);
    left = x / dimensions.width;
    top = y / dimensions.height;
    width = w / dimensions.width;
    height = h / dimensions.height;
  }
  const x = clamp(((image?.hotspot?.x ?? 0.5) - left) / width);
  const y = clamp(((image?.hotspot?.y ?? 0.5) - top) / height);
  return { url: url.toString(), position: `${x * 100}% ${y * 100}%`, x, y };
}

export function squareProjectImage(image?: HeroImage | null, fallback = "") {
  const media = heroImage(image, fallback);
  if (!media.url) return undefined;
  const url = new URL(media.url);
  for (const [key, value] of Object.entries({ w: "800", h: "800", fit: "crop", auto: "format", q: "75" })) {
    url.searchParams.set(key, value);
  }
  if (image?.hotspot && (media.x !== 0.5 || media.y !== 0.5)) {
    url.searchParams.set("crop", "focalpoint");
    url.searchParams.set("fp-x", String(media.x));
    url.searchParams.set("fp-y", String(media.y));
  }
  return url.toString();
}

export function heroVideos(
  desktop?: HeroVideo | null,
  mobile?: HeroVideo | null,
  hasMobileImage = false,
) {
  return {
    desktop: desktop?.url || "",
    mobile: mobile?.url || (hasMobileImage ? "" : desktop?.url || ""),
  };
}
