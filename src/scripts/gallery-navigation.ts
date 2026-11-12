const TOLERANCE = 2;

// Slide starts, rather than a fixed pixel/page increment, handle mixed proportions.
export function galleryScrollTarget(
  starts: number[], current: number, maximum: number, direction: -1 | 1,
): number {
  const position = Math.max(0, Math.min(maximum, current));
  const target = direction === 1
    ? starts.find((start) => start > position + TOLERANCE) ?? maximum
    : starts.findLast((start) => start < position - TOLERANCE) ?? 0;
  return Math.max(0, Math.min(maximum, target));
}
