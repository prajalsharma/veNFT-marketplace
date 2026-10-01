"use client";

import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { OnboardingTour } from "@/components/OnboardingTour";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SupportNudge } from "@/components/SupportNudge";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Ambient background — cinematic depth ── */}
      <div
        className="fixed inset-0 -z-50 pointer-events-none"
        style={{ background: "var(--bg)", transition: "background 380ms var(--ease-spring)" }}
      >
      </div>

      <Header />
      <NetworkSwitcher />
      <main className="relative page-enter">{children}</main>

      <SiteFooter />

      {/* Spacer so page content clears the fixed mobile bottom nav */}
      <div className="lg:hidden" aria-hidden style={{ height: "calc(58px + env(safe-area-inset-bottom))" }} />

      {/* Aave-style mobile bottom tab navigation */}
      <MobileBottomNav />

      {/* One-time invitation to the support page */}
      <SupportNudge />

      {/* Makes the app installable from the browser */}
      <ServiceWorkerRegistrar />

      {/* First-visit walkthrough (reopen via the "How it works" footer link) */}
      <OnboardingTour />
    </>
  );
}
