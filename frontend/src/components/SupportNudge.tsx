"use client";

// A one-time, quiet invitation to the support page. Appears once per browser
// a few seconds after landing (anywhere except the support page itself), and
// never again once dismissed. Deliberately small: this is a nod, not a plea.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart, X } from "lucide-react";

const STORAGE_KEY = "vezo-support-nudge-v1";
const SHOW_AFTER_MS = 8_000;

export function SupportNudge() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  // Everywhere except the support page itself (landing page included).
  const eligible = !pathname.startsWith("/support");

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
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[60] right-4 bottom-20 sm:right-6 sm:bottom-6 w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl p-4"
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
            <X style={{ width: 14, height: 14 }} />
          </button>
          <div className="flex items-center gap-2 mb-1.5 pr-6">
            <Heart style={{ width: 13, height: 13, color: "#FF0040", fill: "#FF0040" }} />
            <p className="text-[14px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>
              Like what you&apos;re seeing?
            </p>
          </div>
          <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: "var(--text-3)" }}>
            Vezo is independent and community-supported. Contributions keep it
            maintained and improving, and every supporter goes on the board.
          </p>
          <Link
            href="/support"
            onClick={dismiss}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "#FF0040" }}
          >
            Support Vezo &rarr;
          </Link>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
