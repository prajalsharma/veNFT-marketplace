import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mezo veNFT Marketplace",
  description: "Trade veBTC and veMEZO NFTs on Mezo Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-mezo-dark min-h-screen`}>
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
