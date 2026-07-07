import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

const ActivityClient = dynamic(() => import("@/components/ActivityClient"), {
  ssr: false,
});

export const metadata: Metadata = pageMetadata({
  title: "Activity",
  path: "/activity",
  description:
    "Track real-time Vezo marketplace activity — veNFT sales, new listings, and cancellations for veBTC and veMEZO on Mezo. Follow onchain volume and trading history as it happens.",
});

export default function ActivityPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Activity", path: "/activity" },
        ]}
      />
      <ActivityClient />
    </>
  );
}
