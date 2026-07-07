import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

const MyListingsClient = dynamic(() => import("@/components/MyListingsClient"), {
  ssr: false,
});

// Wallet-gated, per-user content — noindex so search engines don't index empty
// personal pages, but still follow links out to the marketplace.
export const metadata: Metadata = pageMetadata({
  title: "My Listings",
  path: "/my-listings",
  noindex: true,
  description:
    "Manage your veNFT listings on Vezo — view, edit, and cancel your veBTC and veMEZO listings on Mezo.",
});

export default function MyListingsPage() {
  return <MyListingsClient />;
}
