import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import PartnersClient from "@/components/PartnersClient";

export const metadata: Metadata = pageMetadata({
  title: "Partners",
  path: "/partners",
  description:
    "Vezo's ecosystem partners on Mezo. Use Aurove to keep a veBTC or veMEZO position earning in Mezo Earn while holding a liquid token, or sell the lock on Vezo.",
});

export default function PartnersPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
        ]}
      />
      <PartnersClient />
    </>
  );
}
