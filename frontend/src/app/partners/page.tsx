import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import PartnersClient from "@/components/PartnersClient";

export const metadata: Metadata = pageMetadata({
  title: "Partners and integrations",
  path: "/partners",
  description:
    "Vezo's partners and integrations on Mezo. Use Aurove to keep a veBTC or veMEZO position earning while holding a liquid token, and see how Goldsky indexes every Vezo listing, sale and bid.",
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
