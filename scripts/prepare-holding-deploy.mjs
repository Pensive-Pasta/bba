import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const keepFiles = new Set([
  path.join(distDir, "index.html"),
  path.join(distDir, "404.html"),
]);

async function removeNonHoldingHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await removeNonHoldingHtml(fullPath);
      const remaining = await readdir(fullPath);
      if (remaining.length === 0) {
        await rm(fullPath, { recursive: true, force: true });
      }
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".html") &&
      !keepFiles.has(fullPath)
    ) {
      await rm(fullPath, { force: true });
    }
  }
}

const distStats = await stat(distDir).catch(() => null);

if (!distStats?.isDirectory()) {
  console.error("Holding deploy cleanup skipped: dist/ does not exist.");
  process.exit(1);
}

await removeNonHoldingHtml(distDir);

