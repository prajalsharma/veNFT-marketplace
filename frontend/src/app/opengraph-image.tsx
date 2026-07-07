import { ImageResponse } from "next/og";

// Dynamically-rendered social share card (1200×630) served at /opengraph-image.
// Fully self-contained — no external fonts or images — so it always renders.
export const alt = "Vezo — the veNFT marketplace for veBTC & veMEZO on Mezo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a0010 55%, #2b0016 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #FF0040, #E8003A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Vezo
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 940,
            }}
          >
            The veNFT Marketplace on Mezo
          </div>
          <div style={{ fontSize: 34, color: "#B8B8B8", maxWidth: 900, lineHeight: 1.3 }}>
            Trade veBTC &amp; veMEZO vote-escrowed NFTs at a discount — escrowless,
            non-custodial, on Bitcoin&apos;s Layer 2.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {["veBTC", "veMEZO", "Escrowless", "Bitcoin L2"].map((tag) => (
            <div
              key={tag}
              style={{
                fontSize: 26,
                color: "#FF3366",
                border: "2px solid rgba(255,0,64,0.35)",
                borderRadius: 999,
                padding: "8px 22px",
              }}
            >
              {tag}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 28, color: "#8A8A8A" }}>
            vezo.exchange
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
