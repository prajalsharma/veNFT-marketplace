"use client";

import { useEffect, useState } from "react";

// Where "home" (the logo) should go. On support.vezo.exchange the root URL IS
// the support page (middleware rewrites "/" there), so a plain "/" left the
// logo doing nothing on that host. There it points at the main site instead.
export function useHomeHref(): string {
  const [href, setHref] = useState("/");
  useEffect(() => {
    if (window.location.hostname.startsWith("support.")) setHref("https://www.vezo.exchange/");
  }, []);
  return href;
}
