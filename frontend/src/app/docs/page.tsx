import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd, FaqJsonLd, VEZO_FAQS } from "@/components/JsonLd";

const DocsClient = dynamic(() => import("@/components/DocsClient"), {
  ssr: false,
});

export const metadata: Metadata = pageMetadata({
  title: "Docs — How Vezo & veNFTs Work",
  path: "/docs",
  description:
    "Learn how Vezo works: veNFT mechanics, escrowless non-custodial trading, buying veBTC and veMEZO at a discount, voting power decay, and the smart contracts securing every trade on Mezo.",
});

export default function DocsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
        ]}
      />
      {/* Full FAQ schema on the docs page — strongest AEO surface. */}
      <FaqJsonLd faqs={VEZO_FAQS} />
      <DocsClient />
    </>
  );
}
