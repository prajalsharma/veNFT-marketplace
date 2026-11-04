"use client";

// Site-wide share card for moments announced with announceShare() in
// lib/share.ts. Pinned bottom-right on desktop and above the tab bar on
// phones (the support nudge owns the top). Stays until dismissed.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ShareMoment } from "@/lib/share";
import { SharePrompt } from "@/components/share/SharePrompt";

export function ShareHost() {
  const [moment, setMoment] = useState<ShareMoment | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const on = (e: Event) => setMoment((e as CustomEvent<ShareMoment>).detail);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMoment(null);
    window.addEventListener("vezo:share", on);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("vezo:share", on); window.removeEventListener("keydown", esc); };
  }, []);

  return (
    <AnimatePresence>
      {moment && (
        <motion.aside
          role="status"
          aria-label="Share"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[70] left-3 right-3 sm:left-auto sm:right-6 sm:w-[400px] bottom-[calc(70px+env(safe-area-inset-bottom))] lg:bottom-6 rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-lg)" }}
        >
          <button
            type="button"
            onClick={() => setMoment(null)}
            aria-label="Dismiss"
            className="absolute top-3 right-3 z-10 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "var(--text-3)" }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
          <SharePrompt moment={moment} compact />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
