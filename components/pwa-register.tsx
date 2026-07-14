"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const host = window.location.hostname;
    const secure =
      window.location.protocol === "https:" ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (!secure) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // iOS can still Add to Home Screen without a service worker.
      });
  }, []);

  return null;
}
