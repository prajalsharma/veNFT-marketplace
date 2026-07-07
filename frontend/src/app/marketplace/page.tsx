import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

const MarketplaceClient = dynamic(() => import("@/components/MarketplaceClient"), {
  ssr: false,
});

export const metadata: Metadata = pageMetadata({
  title: "Marketplace",
  path: "/marketplace",
  description:
    "Browse live veBTC and veMEZO veNFT listings on Vezo. Compare intrinsic value, voting power, lock duration, and discount, then buy vote-escrowed NFTs on Mezo in a single escrowless transaction.",
});

export default function MarketplacePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Marketplace", path: "/marketplace" },
        ]}
      />
      <MarketplaceClient />
    </>
  );
}
