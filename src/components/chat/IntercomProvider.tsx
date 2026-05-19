"use client";

import { useEffect } from "react";

export default function IntercomProvider() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;
    if (!appId || typeof window === "undefined") return;

    const w = window as Window & {
      Intercom?: (command: string, payload?: Record<string, string>) => void;
      __intercomLoaded?: boolean;
      intercomSettings?: { app_id: string };
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const loadIntercom = () => {
      if (cancelled) return;
      if (w.Intercom) {
        w.Intercom("reattach_activator");
        w.Intercom("update", { app_id: appId });
        return;
      }

      if (w.__intercomLoaded) return;
      w.__intercomLoaded = true;
      w.intercomSettings = { app_id: appId };

      const d = document;
      const s = d.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = `https://widget.intercom.io/widget/${appId}`;
      const x = d.getElementsByTagName("script")[0];
      if (x?.parentNode) {
        x.parentNode.insertBefore(s, x);
      } else {
        d.head.appendChild(s);
      }
    };

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => {
        timeoutId = setTimeout(loadIntercom, 1500);
      });
    } else {
      timeoutId = setTimeout(loadIntercom, 1500);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return null;
}
