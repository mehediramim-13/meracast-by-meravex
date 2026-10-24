import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { AppChrome } from "@/components/layout/app-chrome";
import { SITE } from "@/lib/constants";

// Self-hosted via @fontsource. `npm run fonts` copies these subset files from
// the fontsource packages before dev/build. Only the two Latin families are
// preloaded; Bengali faces load when Bangla mode needs them.
const plusJakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-heading",
  display: "swap",
  weight: "200 800",
  style: "normal",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
  style: "normal",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
});

const hindSiliguri = localFont({
  src: [
    { path: "./fonts/hind-siliguri-bengali-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/hind-siliguri-bengali-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/hind-siliguri-bengali-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/hind-siliguri-bengali-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-bengali",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

const notoSansBengali = localFont({
  src: "./fonts/noto-sans-bengali-bengali.woff2",
  variable: "--font-bengali-fallback",
  display: "swap",
  weight: "100 900",
  style: "normal",
  preload: false,
  adjustFontFallback: false,
  fallback: ["sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  applicationName: SITE.name,
  description: SITE.description,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "weather",
    "weather forecast",
    "rain radar",
    "rain planner",
    "Dhaka weather",
    "Bangladesh weather",
    "air quality",
    "Open-Meteo",
    "MeraCast",
    "MeraVex",
  ],
  authors: [{ name: "MeraVex", url: SITE.url }],
  creator: "MeraVex",
  publisher: "MeraVex",
  category: "weather",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
    languages: {
      en: "/?lang=en",
      "bn-BD": "/?lang=bn",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["bn_BD"],
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/og.png"],
    creator: SITE.handle,
  },
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a1118" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
  ],
  colorScheme: "dark light",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('meracast-settings-v1');
    var state = stored ? (JSON.parse(stored).state || {}) : {};
    var theme = state.theme || 'system';
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    var root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.lang = state.language || 'en';
    root.dataset.reduceMotion = String(state.reduceMotion === true || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    root.dataset.performance = String(state.performanceMode === true);
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MeraCast",
  applicationCategory: "WeatherApplication",
  operatingSystem: "Any",
  url: SITE.url,
  description: SITE.description,
  creator: { "@type": "Organization", name: "MeraVex" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "16-day weather forecast",
    "Minute nowcast",
    "Rain Planner",
    "Live radar",
    "Air quality",
    "Astronomy",
    "Bengali and English interface",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${inter.variable} ${hindSiliguri.variable} ${notoSansBengali.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-svh antialiased">
        <a
          href="#main-content"
          className="sr-only z-[200] rounded-xl bg-ink px-4 py-3 text-sm font-bold text-surface focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  );
}
