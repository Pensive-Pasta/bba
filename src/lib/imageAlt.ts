interface ImageDescription {
  altText?: string | null;
  alt?: string | null;
  decorative?: boolean;
  asset?: { altText?: string | null } | null;
}

// An explicit blank placement override is intentional. Shared asset text is
// used only when no local override exists; filenames/titles are never invented.
export function imageAlt(image?: ImageDescription | null): string {
  if (image?.decorative) return "";
  const local = image?.altText ?? image?.alt;
  if (typeof local === "string") return local.trim();
  return image?.asset?.altText?.trim() || "";
}
