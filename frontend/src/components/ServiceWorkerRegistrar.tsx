"use client";

// Registers the service worker that makes Vezo installable from the browser
// ("Install app" in Chrome, "Add to Home Screen" on iOS). The worker caches
// nothing by design; see public/sw.js.
//
// Registration is deferred to the load event so it never competes with the
// first paint or the initial listings fetch, and it is skipped on the support
// subdomain, which is a single page rather than an app.

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.hostname.startsWith("support.")) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have; a failure here must never surface.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
