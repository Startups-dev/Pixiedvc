import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type TravelPartyInput = {
  fullName: string;
  type?: "adult" | "child";
  age?: number | null;
  notes?: string | null;
};

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { first: "", last: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

async function getGuestColumns(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "booking_request_guests");

  const set = new Set<string>();
  (data ?? []).forEach((row: { column_name: string }) => set.add(row.column_name));
  return set;
}

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } },
) {
  try {
    const body = (await request.json()) as {
      guestEmail?: string | null;
      guestPhone?: string | null;
      travelParty?: TravelPartyInput[];
    };

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestId = params.requestId;
    if (!requestId) {
      return NextResponse.json({ error: "Missing request id" }, { status: 400 });
    }

    const { data: booking } = await supabase
      .from("booking_requests")
      .select("id, renter_id")
      .eq("id", requestId)
      .maybeSingle();

    if (!booking || booking.renter_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const guestEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim() : null;
    const guestPhone = typeof body.guestPhone === "string" ? body.guestPhone.trim() : null;
    const travelParty = Array.isArray(body.travelParty) ? body.travelParty : [];

    const adults = travelParty.filter((row) => (row.type ?? "adult") === "adult").length;
    const youths = travelParty.filter((row) => (row.type ?? "adult") === "child").length;

    const { error: updateError } = await supabase
      .from("booking_requests")
      .update({
        lead_guest_email: guestEmail || null,
        lead_guest_phone: guestPhone || null,
        adults,
        youths,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("renter_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const guestColumns = await getGuestColumns(supabase);

    await supabase.from("booking_request_guests").delete().eq("booking_id", requestId);

    if (travelParty.length) {
      const rows = travelParty.map((row) => {
        const { first, last } = splitName(row.fullName);
        const payload: Record<string, unknown> = {
          booking_id: requestId,
          first_name: first || null,
          last_name: last || null,
          age_category: (row.type ?? "adult") === "child" ? "youth" : "adult",
          age: typeof row.age === "number" ? row.age : null,
        };

        if (guestColumns.has("notes")) {
          payload.notes = row.notes ?? null;
        }

        return payload;
      });

      const { error: guestError } = await supabase.from("booking_request_guests").insert(rows);
      if (guestError) {
        return NextResponse.json({ error: guestError.message }, { status: 400 });
      }
    }

    const { data: contractRow } = await supabase
      .from("contracts")
      .select("id, snapshot")
      .eq("booking_request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: number; snapshot: Record<string, unknown> | null }>();

    if (contractRow?.id) {
      const snapshot = (contractRow.snapshot ?? {}) as Record<string, unknown>;
      const parties = (snapshot.parties ?? {}) as Record<string, unknown>;
      const guest = (parties.guest ?? {}) as Record<string, unknown>;
      guest.email = guestEmail || null;
      guest.phone = guestPhone || null;
      parties.guest = guest;
      snapshot.parties = parties;

      await supabase
        .from("contracts")
        .update({ snapshot })
        .eq("id", contractRow.id);
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[guest/details] updated", {
        requestId,
        updatedContract: Boolean(contractRow?.id),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to save details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
