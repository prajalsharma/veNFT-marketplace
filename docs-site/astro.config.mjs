import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightLinksValidator from "starlight-links-validator";
import rehypeExternalLinks from "rehype-external-links";

export default defineConfig({
  site: "https://docs.vezo.exchange",
  markdown: {
    rehypePlugins: [
      // External links open in a new tab; internal docs links stay in-tab.
      [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
    ],
  },
  integrations: [
    starlight({
      title: "Vezo Docs",
      description:
        "Documentation for Vezo, the first secondary marketplace for veNFTs on Mezo. Escrowless, atomic trading for veBTC and veMEZO positions.",
      favicon: "/favicon.ico",
      logo: { src: "./src/assets/vezo-logo.svg", alt: "Vezo" },
      customCss: ["./src/styles/custom.css"],
      plugins: [
        starlightLlmsTxt({
          projectName: "Vezo",
          description:
            "Escrowless peer-to-peer marketplace for veBTC and veMEZO vote-escrowed NFTs on Mezo, Bitcoin's Economic Layer.",
        }),
        starlightLinksValidator(),
      ],
      head: [
        { tag: "meta", attrs: { property: "og:image", content: "https://docs.vezo.exchange/og.png" } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        { tag: "meta", attrs: { name: "twitter:image", content: "https://docs.vezo.exchange/og.png" } },
        { tag: "meta", attrs: { name: "theme-color", content: "#FF0040" } },
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Vezo Documentation",
            url: "https://docs.vezo.exchange",
            description:
              "Documentation for Vezo, the escrowless marketplace for veBTC and veMEZO vote-escrowed NFTs on Mezo.",
            publisher: {
              "@type": "Organization",
              name: "Vezo",
              url: "https://www.vezo.exchange",
              logo: "https://docs.vezo.exchange/favicon.svg",
            },
          }),
        },
      ],
      editLink: {
        baseUrl: "https://github.com/prajalsharma/veNFT-marketplace/edit/main/docs-site/",
      },
      // Starlight stays the engine (routing, search, a11y, content); these
      // overrides are the Vezo presentation layer on top of it.
      routeMiddleware: "./src/routeData.ts",
      components: {
        Header: "./src/components/Header.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        SocialIcons: "./src/components/SocialLinks.astro",
        ThemeSelect: "./src/components/ThemeToggle.astro",
        Sidebar: "./src/components/Sidebar.astro",
        MobileMenuFooter: "./src/components/MobileMenuFooter.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Hero: "./src/components/Hero.astro",
        Footer: "./src/components/Footer.astro",
      },
      expressiveCode: {
        themes: ["github-dark-default", "github-light"],
        styleOverrides: {
          borderRadius: "12px",
          borderColor: "var(--vz-hairline)",
          codeBackground: "var(--vz-code-bg)",
          codeFontFamily: "var(--sl-font-mono)",
          codeFontSize: "0.86rem",
          codeLineHeight: "1.7",
          uiFontFamily: "var(--sl-font)",
          frames: {
            shadowColor: "transparent",
            editorTabBarBackground: "var(--vz-subtle)",
            editorActiveTabBackground: "var(--vz-code-bg)",
            editorActiveTabIndicatorTopColor: "transparent",
            editorActiveTabIndicatorBottomColor: "var(--vz-red)",
            editorTabBarBorderBottomColor: "var(--vz-hairline)",
            terminalTitlebarBackground: "var(--vz-subtle)",
            terminalTitlebarBorderBottomColor: "var(--vz-hairline)",
            terminalBackground: "var(--vz-code-bg)",
            inlineButtonBorder: "var(--vz-hairline-strong)",
            tooltipSuccessBackground: "#16a34a",
          },
        },
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
          label: "Guides",
          items: [
            { label: "Getting Started", slug: "guides/getting-started" },
            { label: "Buying a veNFT", slug: "guides/buying" },
            { label: "Selling a veNFT", slug: "guides/selling" },
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
          label: "Architecture",
          items: [
            { label: "System Overview", slug: "architecture/overview" },
            { label: "What We Built, and Why", slug: "architecture/what-we-built" },
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
            { label: "Ask AI About Vezo", slug: "resources/ask-ai" },
            { label: "Links & Addresses", slug: "resources/links" },
          ],
        },
      ],
    }),
  ],
});
