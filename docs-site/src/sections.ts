// The docs are organised into a few sections, each a set of sidebar groups.
// The header shows the sections as tabs; the sidebar shows only the current
// section's groups, so a reader sees the 5-10 pages around them instead of
// all 24 at once. URLs are unchanged: sections are a presentation concern.

export type Section = { id: string; label: string; groups: string[]; href: string };

export const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", groups: ["Introduction"], href: "/introduction/what-is-vezo/" },
  { id: "guides", label: "Guides", groups: ["Guides"], href: "/guides/getting-started/" },
  { id: "protocol", label: "Protocol", groups: ["Core Concepts", "Architecture"], href: "/concepts/marketplace-mechanics/" },
  { id: "developers", label: "Developers", groups: ["Developers"], href: "/developers/integrate/" },
  { id: "resources", label: "Resources", groups: ["Resources"], href: "/resources/faq/" },
];

export const sectionForGroup = (label: string) => SECTIONS.find((s) => s.groups.includes(label));

export const LINKS = {
  app: "https://www.vezo.exchange",
  market: "https://www.vezo.exchange/marketplace",
  analytics: "https://dune.com/vezo/vezo",
  github: "https://github.com/prajalsharma/veNFT-marketplace",
  x: "https://x.com/VezoExchange",
  mezo: "https://mezo.org",
} as const;
