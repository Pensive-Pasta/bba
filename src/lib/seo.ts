export const SITE_NAME = "Butcher Bayley Architects";
export const SITE_TITLE_SUFFIX = "Butcher Bayley Architects (BBA)";
export const DEFAULT_SEO_IMAGE = "/images/logo-og.jpg";

type PortableTextChild = {
  text?: string;
};

type PortableTextBlock = {
  _type?: string;
  children?: PortableTextChild[];
};

type ContentBlock = {
  _type?: string;
  content?: PortableTextBlock[];
  images?: Array<{
    asset?: {
      url?: string;
    };
  }>;
};

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export const firstNonEmpty = (
  ...values: Array<string | null | undefined>
): string | undefined => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
};

export const excerpt = (text?: string, maxLength = 160): string | undefined => {
  const trimmed = text?.replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= maxLength) return trimmed;

  const shortened = trimmed.slice(0, maxLength - 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${(boundary > 80 ? shortened.slice(0, boundary) : shortened).trim()}…`;
};

export const portableTextToPlainText = (
  value?: PortableTextBlock[] | ContentBlock[] | string | null
): string | undefined => {
  if (!value) return undefined;

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim() || undefined;
  }

  const parts: string[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    if ("children" in item && Array.isArray(item.children)) {
      const text = item.children
        .map((child) => child?.text?.trim())
        .filter(Boolean)
        .join(" ");

      if (text) parts.push(text);
      continue;
    }

    if ("content" in item && Array.isArray(item.content)) {
      const text = portableTextToPlainText(item.content);
      if (text) parts.push(text);
    }
  }

  const plainText = parts.join(" ").replace(/\s+/g, " ").trim();
  return plainText || undefined;
};

export const resolveSeoDescription = (
  metaDescription?: string | null,
  ...fallbacks: Array<string | null | undefined>
): string | undefined =>
  firstNonEmpty(
    metaDescription,
    ...fallbacks.map((value) => (value ? excerpt(value) ?? value : undefined))
  );

export const resolveSeoImage = (
  ...candidates: Array<string | null | undefined>
): string => firstNonEmpty(...candidates) ?? DEFAULT_SEO_IMAGE;

export const findFirstImageUrl = (
  blocks?: Array<ContentBlock | null | undefined>
): string | undefined => {
  for (const block of blocks ?? []) {
    if (block?._type !== "imageBlock") continue;

    for (const image of block.images ?? []) {
      const url = image?.asset?.url?.trim();
      if (url) return url;
    }
  }

  return undefined;
};
