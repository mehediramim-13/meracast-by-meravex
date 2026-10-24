/**
 * Copy the exact font files MeraCast uses from @fontsource into app/fonts.
 * Next.js then self-hosts them through next/font/local, which emits the
 * hashed URLs, preload tags and fallback metrics used by the app.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const output = join(root, "app", "fonts");

const files = [
  [
    "node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
    "plus-jakarta-sans-latin.woff2",
  ],
  [
    "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
    "inter-latin.woff2",
  ],
  [
    "node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2",
    "hind-siliguri-bengali-400.woff2",
  ],
  [
    "node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-500-normal.woff2",
    "hind-siliguri-bengali-500.woff2",
  ],
  [
    "node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-600-normal.woff2",
    "hind-siliguri-bengali-600.woff2",
  ],
  [
    "node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-700-normal.woff2",
    "hind-siliguri-bengali-700.woff2",
  ],
  [
    "node_modules/@fontsource-variable/noto-sans-bengali/files/noto-sans-bengali-bengali-wght-normal.woff2",
    "noto-sans-bengali-bengali.woff2",
  ],
];

await mkdir(output, { recursive: true });
for (const [source, target] of files) {
  await copyFile(join(root, source), join(output, target));
}
console.log(`Synced ${files.length} font files to app/fonts.`);
