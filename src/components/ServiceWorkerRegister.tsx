"use client";

import { useEffect } from "react";

// Registers the service worker once on the client. Required for Web Push and
// PWA installability. Safe to mount app-wide.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on unsupported/insecure contexts — ignore.
    });
  }, []);
  return null;
}
