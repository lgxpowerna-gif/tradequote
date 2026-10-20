import { ImageResponse } from "next/og";

// Image shown when the site is shared on Facebook, Messenger, LinkedIn, etc.
export const alt = "TradeQuote – Soumissions et factures pour entrepreneurs du Québec";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#2563eb", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 96, height: 96, borderRadius: 22, background: "#ffffff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, fontWeight: 700 }}>T</div>
          <div style={{ fontSize: 64, fontWeight: 700 }}>TradeQuote</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.15 }}>Soumissions et factures pour entrepreneurs du Québec</div>
          <div style={{ fontSize: 34, opacity: 0.9 }}>Licence RBQ · TPS/TVQ · Acomptes · PDF · Sans compte</div>
        </div>
        <div style={{ fontSize: 30, opacity: 0.85 }}>tradequote.faitle.net</div>
      </div>
    ),
    { ...size }
  );
}
