export function normaliseText(input: string | undefined | null): string[] {
  const s = (input ?? "").replace(/\r\n/g, "\n");
  return s
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);
}