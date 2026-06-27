"use client";

// Mobile bottom tab bar — the standard mobile-dApp navigation pattern (Aave,
// Uniswap mobile): primary routes at thumb reach, always visible. Replaces
// relying on the hamburger for primary navigation. Hidden on lg+ (desktop uses
// the centered header nav).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Tag, Activity, BookOpen } from "lucide-react";

const TABS = [
  { href: "/marketplace", label: "Market",   icon: Store },
  { href: "/my-listings", label: "Listings", icon: Tag },
  { href: "/activity",    label: "Activity", icon: Activity },
  { href: "/docs",        label: "Docs",     icon: BookOpen },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      aria-label="Primary"
      style={{
        background: "var(--header-bg)",
        borderTop: "1px solid var(--header-border)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch justify-around h-[58px]">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname?.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-inset"
              style={{ color: active ? "#FF0040" : "var(--text-3)" }}
            >
              {/* active indicator dot */}
              <span className="relative flex items-center justify-center">
                <Icon style={{ width: 20, height: 20 }} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="text-[10px] font-bold" style={{ letterSpacing: "-0.01em" }}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
