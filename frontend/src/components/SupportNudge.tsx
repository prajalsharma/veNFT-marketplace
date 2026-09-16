"use client";

// The support ask. Top-center, sliding down from under the header: the
// highest-attention spot on the page (eye-tracking F-patterns start there,
// while bottom corners suffer banner blindness from years of cookie notices
// and chat widgets). Wikipedia's fundraising banner lives at the top of the
// page for the same reason.
//
// The copy is a direct, honest ask in the reciprocity frame: you've used the
// product, help keep it running. It appears once on whatever page the user
// first enters (never on the support page itself), shortly after load, and a
// dismissal is respected forever. Respecting the "no" is part of the ask.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { mezoTestnet, mezoMainnet } from "@/lib/wagmi";

// v2: the ask moved top-center with new copy; earlier dismissals of the timid
// bottom-corner version don't carry over.
const STORAGE_KEY = "vezo-support-nudge-v2";
const SHOW_AFTER_MS = 2_500;

export function SupportNudge() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  // The wrong-network banner occupies the same top-center spot. A functional
  // warning always outranks an ask, so the nudge waits until it clears.
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  const wrongNetwork =
    isConnected && chainId !== (network === "testnet" ? mezoTestnet.id : mezoMainnet.id);

  const eligible = !pathname.startsWith("/support") && !wrongNetwork;

  useEffect(() => {
    if (!eligible) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const id = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [eligible]);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {visible && eligible && (
        <motion.aside
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[60] left-3 right-3 mx-auto top-[102px] lg:top-[118px] max-w-[600px] rounded-2xl p-4 sm:p-5"
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
          role="complementary"
          aria-label="Support Vezo"
        >
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 p-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "var(--text-4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-4)")}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>

          <div className="flex items-center gap-2 mb-1.5 pr-7">
            <Heart style={{ width: 14, height: 14, color: "#FF0040", fill: "#FF0040", flexShrink: 0 }} />
            <p className="text-[15px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>
              Like what you&apos;re seeing? We&apos;re asking for your support.
            </p>
          </div>
          <p className="text-[13px] leading-relaxed mb-3.5 pr-2" style={{ color: "var(--text-2)" }}>
            Vezo is independent and free to use. If it&apos;s been useful to you,
            a contribution in BTC, MEZO, or MUSD helps fund the infrastructure,
            audits, and new features that keep it running. Every supporter goes
            on the public board.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/support"
              onClick={dismiss}
              className="inline-flex items-center px-4 py-2 rounded-xl text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
              style={{ background: "#FF0040", color: "#fff" }}
            >
              Support Vezo
            </Link>
            <button
              onClick={dismiss}
              className="text-[13px] font-semibold rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              Not now
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
