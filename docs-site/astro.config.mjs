import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.vezo.exchange",
  integrations: [
    starlight({
      title: "vezo",
      description:
        "Documentation for Vezo — the escrowless marketplace for veBTC and veMEZO vote-escrowed NFTs on Mezo.",
      favicon: "/favicon.ico",
      logo: { src: "./src/assets/vezo-logo.svg", alt: "Vezo" },
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl: "https://github.com/prajalsharma/veNFT-marketplace/edit/main/docs-site/",
      },
      components: {
        SocialIcons: "./src/components/HeaderLinks.astro",
        ThemeSelect: "./src/components/ThemeToggle.astro",
      },
      sidebar: [
        {
          label: "Introduction",
          items: [
            { label: "What is Vezo?", slug: "introduction/what-is-vezo" },
            { label: "What is Mezo?", slug: "introduction/what-is-mezo" },
            { label: "Vote-Escrow & veNFTs", slug: "introduction/vote-escrow" },
            { label: "Who is Vezo for?", slug: "introduction/who-is-vezo-for" },
          ],
        },
        {
          label: "Core Concepts",
          items: [
            { label: "Marketplace Mechanics", slug: "concepts/marketplace-mechanics" },
            { label: "Pricing & Discounts", slug: "concepts/pricing-and-discounts" },
            { label: "Bidding", slug: "concepts/bidding" },
            { label: "Pay With Any Token", slug: "concepts/pay-with-any-token" },
            { label: "Fees", slug: "concepts/fees" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Getting Started", slug: "guides/getting-started" },
            { label: "Buying a veNFT", slug: "guides/buying" },
            { label: "Selling a veNFT", slug: "guides/selling" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "System Overview", slug: "architecture/overview" },
            { label: "Smart Contracts", slug: "architecture/contracts" },
            { label: "Security", slug: "architecture/security" },
          ],
        },
        {
          label: "Developers",
          items: [
            { label: "Contract Integration", slug: "developers/integrate" },
            { label: "Subgraph & Data", slug: "developers/subgraph" },
            { label: "Run Locally", slug: "developers/run-locally" },
          ],
        },
        {
          label: "Resources",
          items: [
            { label: "FAQ", slug: "resources/faq" },
            { label: "Links & Addresses", slug: "resources/links" },
          ],
        },
      ],
    }),
  ],
});
