import type { Project } from "../types/Project";
import { hasPublishedEditorial } from "./publicContent.ts";

// Used by route generation, cards and the index. A photo or slug alone never
// enables a page. Queries use the published perspective and project its text.
export function projectDetailHref(project: Project): string | undefined {
  const slug = project.slug?.current;
  if (project._id?.startsWith("drafts.") || project.caseStudyEnabled !== true ||
    !hasPublishedEditorial(project.caseStudyText) || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !(project.heroImage?.asset?.url || project.imageUrl || project.heroVideo?.url)) return undefined;
  return `/work/${slug}`;
}

export function workGridProjects(projects: (Project | null)[] = []): Project[] {
  const seen = new Set<string>();
  return projects.filter((project): project is Project => {
    if (!project || !projectDetailHref(project) || !(project.heroImage?.asset?.url || project.imageUrl)) return false;
    const identity = project._id ?? project.slug!.current;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export interface HomeProjectTile {
  display: "media" | "postcode";
  label?: string;
  project?: Project | null;
}

export function homeProjectTiles(tiles: HomeProjectTile[] = []) {
  const items = tiles.map((tile) => ({
    label: tile.project?.postCode || tile.label || "",
    project: tile.project,
    media: tile.display === "media" && Boolean(tile.project?.heroImage?.asset?.url || tile.project?.imageUrl || tile.project?.heroVideo?.url),
  }));
  // Keep the existing two-column row completion, without inventing projects.
  if (items.length % 2 !== 0) items.push({ label: "", project: undefined, media: false });
  return items;
}
