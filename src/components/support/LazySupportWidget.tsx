"use client";

import { useEffect, useState, type ComponentType } from "react";

export default function LazySupportWidget() {
  const [SupportWidget, setSupportWidget] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;

    void import("./SupportWidget").then((module) => {
      if (mounted) {
        setSupportWidget(() => module.default as ComponentType);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!SupportWidget) {
    return null;
  }

  return <SupportWidget />;
}
