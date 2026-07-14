"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";

const STORAGE_KEY = "dawg_install_hint_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return displayMode || iosStandalone;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // ignore
    }
    // Phone / narrow screens only — desktop can still install, but this tip is for parents on mobile.
    if (window.matchMedia("(min-width: 768px)").matches) return;
    setIos(isIos());
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="border-b border-brand/25 bg-brand/10 px-4 py-2.5 text-sm">
      <div className="mx-auto flex max-w-6xl items-start gap-3 sm:items-center">
        <Smartphone className="mt-0.5 size-4 shrink-0 text-gold sm:mt-0" aria-hidden />
        <p className="min-w-0 flex-1 text-foreground/90">
          {ios ? (
            <>
              Save DAWG to your phone: tap{" "}
              <Share className="mx-0.5 inline size-3.5 text-gold" aria-hidden />{" "}
              <span className="font-medium">Share</span>, then{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </>
          ) : (
            <>
              Save DAWG to your phone: open the browser menu and choose{" "}
              <span className="font-medium">Install app</span> or{" "}
              <span className="font-medium">Add to Home screen</span>.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-brand/20 hover:text-foreground"
          aria-label="Dismiss install tip"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
