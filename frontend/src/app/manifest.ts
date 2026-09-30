import type { MetadataRoute } from "next";
import { SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";

// Web app manifest — /manifest.webmanifest. Chrome's install criteria need a
// 192px and a 512px PNG icon plus a maskable one (Android crops icons to the
// launcher's shape; without a maskable entry it pads the icon into a white
// box). The service worker at /sw.js completes the requirements.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — veNFT Marketplace on Mezo`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#080808",
    theme_color: "#080808",
    categories: ["finance", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Marketplace", url: "/marketplace", description: "Browse veNFT listings" },
      { name: "My Listings", url: "/my-listings", description: "Positions you have listed" },
    ],
  };
}
