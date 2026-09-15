import type { Metadata } from "next";
import dynamic from "next/dynamic";

const SupportClient = dynamic(() => import("@/components/support/SupportClient"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "Support Vezo",
  description:
    "Back the team behind Mezo's first secondary marketplace for veNFTs. Contribute BTC, MEZO, or MUSD directly on-chain. Every supporter is on the public board.",
  alternates: { canonical: "https://support.vezo.exchange" },
  openGraph: {
    title: "Support Vezo",
    description:
      "The Mezo-native way to buy the Vezo team a coffee. On-chain, public, in BTC, MEZO, or MUSD.",
    url: "https://support.vezo.exchange",
  },
};

export default function SupportPage() {
  return <SupportClient />;
}
