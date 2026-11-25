export const validPublicSlug = (slug?: string) => Boolean(slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));

export function hasPublishedEditorial(text?: string) {
  const value = text?.replace(/\s+/g, " ").trim();
  return Boolean(value && !/lorem ipsum/i.test(value) && !/^(coming soon|content coming soon|placeholder|to be confirmed)[.!]?$/i.test(value));
}

export interface PublicInsight {
  _id?: string;
  slug?: { current?: string };
}

// Callers fetch the published perspective. Only technical route safety is
// checked here; article copy and display dates never decide publication.
export function isPublicInsight(insight: PublicInsight | null | undefined): boolean {
  return Boolean(insight && !insight._id?.startsWith("drafts.") && validPublicSlug(insight.slug?.current));
}
