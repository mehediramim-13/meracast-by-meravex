/**
 * Next 14's font manifest plugin matches loader requests with POSIX separators.
 * On Windows that leaves the app font manifest empty, so Next never emits the
 * preload Link headers for the Latin fonts. Linux/macOS builds already populate
 * the manifest; only patch a genuinely empty one. Pre-rendered pages also need
 * the same tags added to their HTML after the manifest has been repaired.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const manifestPath = join(process.cwd(), ".next", "server", "next-font-manifest.json");
const mediaDir = join(process.cwd(), ".next", "static", "media");
const appDir = join(process.cwd(), ".next", "server", "app");

let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  console.log("Font manifest not found; skipping preload fix.");
  process.exit(0);
}

const mediaFiles = await readdir(mediaDir).catch(() => []);
const preloaded = [...new Set(
  Object.values(manifest.app ?? {})
    .flat()
    .filter((file) => typeof file === "string" && /\.p\.woff2$/.test(file))
    .map((file) => file.replace(/^\/+/, "")),
)];

if (manifest.app && Object.keys(manifest.app).length > 0) {
  console.log("Font manifest already populated.");
} else {
  const discovered = mediaFiles
    .filter((file) => /\.p\.woff2$/.test(file))
    .map((file) => `static/media/${file}`)
    .sort();

  if (discovered.length === 0) {
    console.log("No preloadable font files found.");
    process.exit(0);
  }

  preloaded.push(...discovered);
  const layoutKey = join(process.cwd(), "app", "layout");
  manifest.app = { [layoutKey]: discovered };
  manifest.appUsingSizeAdjust = mediaFiles.some((file) => /-s\.p\.woff2$/.test(file));
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
  console.log(`Patched font preload manifest for ${discovered.length} Latin fonts.`);
}

const htmlFiles = [];
async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectHtml(path);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(path);
    }
  }
}

await collectHtml(appDir);

let patched = 0;
let tagCount = 0;
for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");
  if (!html.includes("</head>")) continue;

  const missing = preloaded.filter((font) => !html.includes(font));
  if (missing.length === 0) continue;

  const tags = missing
    .map((font) => `<link rel="preload" href="/_next/${font}" as="font" type="font/woff2" crossorigin=""/>`)
    .join("");
  await writeFile(path, html.replace("</head>", `${tags}</head>`), "utf8");
  patched += 1;
  tagCount += missing.length;
}

console.log(`Patched Latin font preload tags in ${patched} pre-rendered pages (${tagCount} tags).`);
