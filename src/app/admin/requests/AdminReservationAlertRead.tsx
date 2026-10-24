"use client";

import { useEffect } from "react";

export default function AdminReservationAlertRead({ requestId, source }: { requestId: string; source: "booking" | "renter" }) {
  useEffect(() => {
    void fetch("/api/admin/reservations/alerts/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, source }),
    }).catch(() => undefined);
  }, [requestId, source]);
  return null;
}
