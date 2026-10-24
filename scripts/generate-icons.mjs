import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ICONS = join(ROOT, "public", "icons");
const PUBLIC = join(ROOT, "public");

const ICON_SOURCE = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="30" y1="18" x2="482" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0C2136" />
      <stop offset="0.55" stop-color="#071827" />
      <stop offset="1" stop-color="#03080E" />
    </linearGradient>
    <linearGradient id="mark" x1="128" y1="194" x2="384" y2="344" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5EEAD4" />
      <stop offset="0.55" stop-color="#8AB4FF" />
      <stop offset="1" stop-color="#FFD38A" />
    </linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5">
      <stop stop-color="#5EEAD4" stop-opacity="0.3" />
      <stop offset="1" stop-color="#5EEAD4" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5">
      <stop stop-color="#FFB86B" stop-opacity="0.24" />
      <stop offset="1" stop-color="#FFB86B" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  <circle cx="408" cy="96" r="210" fill="url(#glowA)" />
  <circle cx="92" cy="436" r="190" fill="url(#glowB)" />
  <path d="M112 394H400" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="10" stroke-linecap="round" />
  <path
    d="M128 344V228C128 193 171 178 194 205L256 277L318 205C341 178 384 193 384 228V344"
    stroke="url(#mark)"
    stroke-width="34"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
  <circle cx="256" cy="390" r="19" fill="#FFD38A" />
</svg>
`;

const FAVICON_SOURCE = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="bg" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0C2136" />
      <stop offset="1" stop-color="#03080E" />
    </linearGradient>
    <linearGradient id="mark" x1="12" y1="16" x2="38" y2="34" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5EEAD4" />
      <stop offset="0.55" stop-color="#8AB4FF" />
      <stop offset="1" stop-color="#FFD38A" />
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="46" height="46" rx="14.5" fill="url(#bg)" stroke="rgba(255,255,255,0.14)" />
  <path d="M11.5 31.5V20.4C11.5 17.2 15.3 15.9 17.5 18.4L24 25.6L30.5 18.4C32.7 15.9 36.5 17.2 36.5 20.4V31.5" stroke="url(#mark)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="24" cy="36.2" r="2.3" fill="#FFD38A" />
</svg>
`;

const OG_SOURCE = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#0D2A42" />
      <stop offset="0.48" stop-color="#071827" />
      <stop offset="1" stop-color="#03080E" />
    </linearGradient>
    <radialGradient id="aurora" cx="0.18" cy="0.08" r="0.82">
      <stop stop-color="#5EEAD4" stop-opacity="0.22" />
      <stop offset="0.52" stop-color="#5EEAD4" stop-opacity="0.04" />
      <stop offset="1" stop-color="#5EEAD4" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ice" cx="0.82" cy="0.1" r="0.72">
      <stop stop-color="#8AB4FF" stop-opacity="0.24" />
      <stop offset="1" stop-color="#8AB4FF" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="mark" x1="88" y1="90" x2="164" y2="158" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5EEAD4" />
      <stop offset="0.55" stop-color="#8AB4FF" />
      <stop offset="1" stop-color="#FFD38A" />
    </linearGradient>
    <linearGradient id="word" x1="88" y1="240" x2="400" y2="292" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5EEAD4" />
      <stop offset="1" stop-color="#8AB4FF" />
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#5EEAD4" stop-opacity="0.55" />
      <stop offset="1" stop-color="#5EEAD4" stop-opacity="0" />
    </linearGradient>
    <filter id="blur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="46" />
    </filter>
    <filter id="blurSmall" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#aurora)" />
  <rect width="1200" height="630" fill="url(#ice)" />
  <circle cx="1040" cy="112" r="120" fill="#8AB4FF" opacity="0.18" filter="url(#blur)" />
  <circle cx="330" cy="590" r="110" fill="#FFB86B" opacity="0.14" filter="url(#blur)" />
  <circle cx="210" cy="120" r="80" fill="#5EEAD4" opacity="0.12" filter="url(#blur)" />

  <g opacity="0.9">
    <g transform="translate(980 438)">
      <circle r="256" fill="none" stroke="#B7D8EC" stroke-opacity="0.1" />
      <circle r="206" fill="none" stroke="#B7D8EC" stroke-opacity="0.12" />
      <circle r="152" fill="none" stroke="#B7D8EC" stroke-opacity="0.14" />
      <circle r="98" fill="none" stroke="#B7D8EC" stroke-opacity="0.16" />
      <circle r="44" fill="none" stroke="#B7D8EC" stroke-opacity="0.2" />
      <path d="M0 0 L0 -206 A206 206 0 0 1 178 -103 Z" fill="url(#sweep)" opacity="0.55" />
      <path d="M0 0 L0 -256" stroke="#5EEAD4" stroke-opacity="0.35" stroke-width="1.5" />
      <circle cx="0" cy="0" r="5" fill="#5EEAD4" />
      <circle cx="86" cy="-134" r="7" fill="#5EEAD4" opacity="0.9" />
      <circle cx="146" cy="60" r="6" fill="#8AB4FF" opacity="0.85" />
      <circle cx="-128" cy="-54" r="8" fill="#FFD38A" opacity="0.8" />
      <circle cx="-58" cy="150" r="5" fill="#5EEAD4" opacity="0.7" />
    </g>
  </g>

  <g transform="translate(790 96)">
    <rect width="310" height="164" rx="30" fill="#FFFFFF" fill-opacity="0.055" stroke="#FFFFFF" stroke-opacity="0.14" />
    <text x="28" y="45" fill="#8EA4BA" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2.4">DHAKA · LIVE</text>
    <text x="28" y="112" fill="#F3F8FF" font-family="Arial, sans-serif" font-size="54" font-weight="700">26°</text>
    <text x="126" y="106" fill="#C1D3E5" font-family="Arial, sans-serif" font-size="17" font-weight="600">Partly cloudy</text>
    <rect x="28" y="128" width="72" height="7" rx="3.5" fill="#5EEAD4" fill-opacity="0.7" />
    <rect x="108" y="128" width="110" height="7" rx="3.5" fill="#FFFFFF" fill-opacity="0.16" />
  </g>

  <g transform="translate(88 80)">
    <rect width="78" height="78" rx="23" fill="#0B1B2B" stroke="#FFFFFF" stroke-opacity="0.14" />
    <path d="M19 51V32C19 24.5 28.5 21.5 33.5 27.5L39 34L44.5 27.5C49.5 21.5 59 24.5 59 32V51" fill="none" stroke="url(#mark)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="39" cy="59" r="3.4" fill="#FFD38A" />
  </g>

  <text x="88" y="286" fill="#F4F8FF" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" letter-spacing="-5">Mera<tspan fill="url(#word)">Cast</tspan></text>
  <text x="88" y="350" fill="#C7D7E8" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="39">Know before the clouds do.</text>
  <text x="90" y="398" fill="#8B9FB4" font-family="Arial, sans-serif" font-size="20" font-weight="500">A cinematic weather experience by MeraVex</text>

  <g transform="translate(88 446)" font-family="Arial, sans-serif" font-size="15" font-weight="600">
    <rect width="152" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.055" stroke="#FFFFFF" stroke-opacity="0.13" />
    <text x="76" y="26" text-anchor="middle" fill="#C8D8E8">Live radar</text>
    <g transform="translate(164 0)">
      <rect width="177" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.055" stroke="#FFFFFF" stroke-opacity="0.13" />
      <text x="88.5" y="26" text-anchor="middle" fill="#C8D8E8">Rain Planner</text>
    </g>
    <g transform="translate(353 0)">
      <rect width="190" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.055" stroke="#FFFFFF" stroke-opacity="0.13" />
      <text x="95" y="26" text-anchor="middle" fill="#C8D8E8">16-day forecast</text>
    </g>
    <g transform="translate(555 0)">
      <rect width="158" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.055" stroke="#FFFFFF" stroke-opacity="0.13" />
      <text x="79" y="26" text-anchor="middle" fill="#C8D8E8">English · বাংলা</text>
    </g>
  </g>

  <text x="88" y="574" fill="#60768E" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2.8">MERACAST BY MERAVEX</text>
  <text x="1112" y="574" text-anchor="end" fill="#60768E" font-family="Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="1.1">OPEN-METEO · RAINVIEWER · OPENFREEMAP</text>
</svg>
`;

async function main() {
  await mkdir(ICONS, { recursive: true });

  const iconBuffer = Buffer.from(ICON_SOURCE);
  await sharp(iconBuffer).png({ compressionLevel: 9 }).toFile(join(ICONS, "icon-512.png"));
  await sharp(iconBuffer).resize(192, 192).png({ compressionLevel: 9 }).toFile(join(ICONS, "icon-192.png"));
  await sharp(iconBuffer).resize(512, 512).png({ compressionLevel: 9 }).toFile(join(ICONS, "icon-512-maskable.png"));
  await sharp(iconBuffer).resize(180, 180).png({ compressionLevel: 9 }).toFile(join(ICONS, "apple-touch-icon.png"));

  await writeFile(join(ICONS, "icon.svg"), ICON_SOURCE.trim(), "utf8");
  await writeFile(join(PUBLIC, "favicon.svg"), FAVICON_SOURCE.trim(), "utf8");

  await sharp(Buffer.from(OG_SOURCE)).png({ compressionLevel: 9 }).toFile(join(PUBLIC, "og.png"));

  console.log("MeraCast icons + OG image generated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
