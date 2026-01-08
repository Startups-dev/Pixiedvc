"use client";

import { useEffect } from "react";

export default function IntercomProvider() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;
    if (!appId || typeof window === "undefined") return;

    const w = window as any;
    if (w.Intercom) {
      w.Intercom("reattach_activator");
      w.Intercom("update", { app_id: appId });
      return;
    }

    if (w.__intercomLoaded) return;
    w.__intercomLoaded = true;
    w.intercomSettings = { app_id: appId };

    (function () {
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
    })();
  }, []);

  return null;
}
