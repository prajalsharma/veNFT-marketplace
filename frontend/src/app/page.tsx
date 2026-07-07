import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FaqJsonLd, VEZO_FAQS } from "@/components/JsonLd";

const HomeClient = dynamic(() => import("@/components/HomeClient"), {
  ssr: false,
});

export const metadata: Metadata = pageMetadata({
  path: "/",
  description:
    "Vezo is the escrowless marketplace for veBTC and veMEZO vote-escrowed NFTs on Mezo, Bitcoin's Layer 2. Buy veNFTs below intrinsic value, unlock voting power, and keep full custody — your NFT never leaves your wallet until the moment of sale.",
});

export default function Home() {
  return (
    <>
      {/* Homepage FAQ powers featured snippets & AI answers (AEO). */}
      <FaqJsonLd faqs={VEZO_FAQS} />
      <HomeClient />
    </>
  );
}
