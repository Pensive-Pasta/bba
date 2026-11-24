import type { Project } from "../types/Project";

type ProjectImage = Pick<Project, "heroImage" | "imageUrl">;

// Use the same image source/fallback as squareProjectImage. Video alone does
// not turn a project without a hero photograph into a linked image tile.
export function projectCheckerboard<T extends ProjectImage>(projects: readonly T[], columns: number): T[] {
  if (!Number.isInteger(columns) || columns < 1) {
    throw new RangeError("The grid column count must be a positive integer");
  }

  const images: T[] = [];
  const whites: T[] = [];
  for (const project of projects) {
    (project.heroImage?.asset?.url || project.imageUrl ? images : whites).push(project);
  }

  const ordered: T[] = [];
  let image = 0;
  let white = 0;
  while (image < images.length && white < whites.length) {
    const index = ordered.length;
    const wantsWhite = columns === 1
      ? index % 2 === 0
      : (Math.floor(index / columns) + index % columns) % 2 === 0;
    ordered.push(wantsWhite ? whites[white++] : images[image++]);
  }

  return [...ordered, ...images.slice(image), ...whites.slice(white)];
}
