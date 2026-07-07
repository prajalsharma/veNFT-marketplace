import type { MetadataRoute } from "next";
import { SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";

// Web app manifest — /manifest.webmanifest. Enables install-to-home-screen and
// gives search engines/PWA tooling a clean app identity.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — veNFT Marketplace on Mezo`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    categories: ["finance", "business"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
