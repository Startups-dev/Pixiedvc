import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

import { sendReadyStayBookingPackageToOwner } from "@/lib/email";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      status?: string | null;
      payment_status?: string;
      amount_total?: number | null;
      currency?: string | null;
      client_reference_id?: string | null;
      metadata?: Record<string, string | null | undefined> | null;
      id?: string | null;
      payment_intent?: string | null;
    };
  };
};

function parseSignatureHeader(header: string | null) {
  if (!header) return null;
  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));
  if (!timestampPart || signatureParts.length === 0) return null;
  const timestamp = timestampPart.replace("t=", "");
  const signatures = signatureParts.map((part) => part.replace("v1=", ""));
  return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return parsed.signatures.some((signature) => {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook secret missing." }, { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  const payload = await request.text();

  const signatureOk = verifyStripeSignature(payload, signatureHeader, secret);
  if (process.env.NODE_ENV !== "production") {
    console.info("[stripe/webhook] signature", {
      ok: signatureOk,
    });
  }

  if (!signatureOk) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (process.env.NODE_ENV !== "production") {
    console.info("[stripe/webhook] event", { type: event.type, id: event.id });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId =
      session.metadata?.booking_request_id ??
      session.client_reference_id ??
      session.metadata?.booking_id ??
      null;
    const paymentType = session.metadata?.payment_type ?? null;
    const amountPaid = typeof session.amount_total === "number" ? session.amount_total / 100 : null;
    const currency = session.currency?.toUpperCase() ?? "USD";

    if (process.env.NODE_ENV !== "production") {
      console.info("[stripe/webhook] resolve booking", {
        booking_request_id: bookingId,
        paid: session.payment_status === "paid",
      });
    }

    const isPaid = session.payment_status === "paid";
    const isComplete = session.status === "complete";
    const shouldProcess =
      Boolean(bookingId) && (isPaid || (paymentType === "full" && isComplete));

    if (shouldProcess && bookingId) {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        let data: unknown = null;
        let error: unknown = null;

        // Only mark booking requests as submitted for deposit sessions.
        // This prevents contract/booking checkouts from stomping booking lifecycle state.
        if (paymentType === "deposit" && amountPaid) {
          const depositUpdate = await supabase
            .from("booking_requests")
            .update({
              deposit_paid: amountPaid,
              deposit_currency: currency,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);
          data = depositUpdate.data;
          error = depositUpdate.error;
          if (depositUpdate.error) {
            console.error("[stripe/webhook] deposit update failed", {
              booking_request_id: bookingId,
              session_id: event.id,
              code: depositUpdate.error.code,
              message: depositUpdate.error.message,
              details: depositUpdate.error.details,
              hint: depositUpdate.error.hint,
            });
          }

          // Only promote lifecycle status when the request is still draft.
          await supabase
            .from("booking_requests")
            .update({
              status: "submitted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .eq("status", "draft");
        }

        if (paymentType === "full") {
          const nowIso = new Date().toISOString();
          const contractId = session.metadata?.contract_id ?? null;
          const readyStayIdFromMetadata = session.metadata?.ready_stay_id ?? null;

          if (process.env.NODE_ENV !== "production") {
            console.info(`[stripe] full payment completed bookingId=${bookingId} session=${session.id ?? "unknown"}`);
          }

          const { data: existingBookingForIdempotency, error: existingBookingError } = await supabase
            .from("booking_requests")
            .select("id, payment_status, booking_package_emailed_at")
            .eq("id", bookingId)
            .maybeSingle();

          if (existingBookingError) {
            console.error("[ready-stays] booking package idempotency check failed", {
              bookingRequestId: bookingId,
              sessionId: session.id ?? null,
              code: existingBookingError.code,
              message: existingBookingError.message,
              details: existingBookingError.details,
              hint: existingBookingError.hint,
            });
          }

          if (!existingBookingForIdempotency) {
            console.error("[stripe] full payment booking not found", {
              bookingId,
              sessionId: session.id ?? null,
            });
            return NextResponse.json(
              { ok: true, warning: "booking_request_not_found", bookingRequestId: bookingId },
              { status: 200 },
            );
          }

          if (existingBookingForIdempotency.payment_status === "paid") {
            return NextResponse.json(
              { received: true, alreadyProcessed: true, bookingRequestId: bookingId },
              { status: 200 },
            );
          }

          const { error: markPaidError } = await supabase
            .from("booking_requests")
            .update({
              payment_status: "paid",
              paid_at: nowIso,
              status: "paid_waiting_owner_transfer",
              updated_at: nowIso,
            })
            .eq("id", bookingId)
            .neq("payment_status", "paid");
          if (markPaidError) {
            console.error("[stripe] full payment mark paid failed", {
              bookingId,
              sessionId: session.id ?? null,
              code: markPaidError.code,
              message: markPaidError.message,
              details: markPaidError.details,
              hint: markPaidError.hint,
            });
            return NextResponse.json(
              { ok: true, warning: "booking_mark_paid_failed", bookingRequestId: bookingId },
              { status: 200 },
            );
          }

          await supabase
            .from("booking_requests")
            .update({
              stripe_checkout_session_id: session.id ?? null,
              updated_at: nowIso,
            })
            .eq("id", bookingId)
            .is("stripe_checkout_session_id", null);

          if (process.env.NODE_ENV !== "production") {
            console.info(`[stripe] booking_requests marked paid bookingId=${bookingId}`);
          }

          let readyStayIdMarked: string | null = null;
          if (readyStayIdFromMetadata) {
            const { data: updatedRows, error: readyStayByIdError } = await supabase
              .from("ready_stays")
              .update({
                status: "sold",
                booking_request_id: bookingId,
                sold_booking_request_id: bookingId,
                locked_until: null,
                lock_session_id: null,
                updated_at: nowIso,
              })
              .eq("id", readyStayIdFromMetadata)
              .select("id");
            if (readyStayByIdError) {
              console.error("[stripe] ready_stays mark sold failed by metadata id", {
                bookingId,
                readyStayId: readyStayIdFromMetadata,
                sessionId: session.id ?? null,
                code: readyStayByIdError.code,
                message: readyStayByIdError.message,
                details: readyStayByIdError.details,
                hint: readyStayByIdError.hint,
              });
            } else if (updatedRows && updatedRows.length > 0) {
              readyStayIdMarked = updatedRows[0]?.id ?? null;
            }
          } else {
            const { data: matches, error: readyStayFindError } = await supabase
              .from("ready_stays")
              .select("id")
              .eq("booking_request_id", bookingId);
            if (readyStayFindError) {
              console.error("[stripe] ready_stays lookup failed by booking_request_id", {
                bookingId,
                sessionId: session.id ?? null,
                code: readyStayFindError.code,
                message: readyStayFindError.message,
                details: readyStayFindError.details,
                hint: readyStayFindError.hint,
              });
            } else if (!matches || matches.length === 0) {
              console.error("[stripe] ready_stays lookup found no rows by booking_request_id", {
                bookingId,
                sessionId: session.id ?? null,
              });
            } else if (matches.length > 1) {
              console.error("[stripe] ready_stays lookup found multiple rows by booking_request_id", {
                bookingId,
                sessionId: session.id ?? null,
                readyStayIds: matches.map((row) => row.id),
              });
            } else {
              const targetReadyStayId = matches[0].id;
              const { error: readyStayByBookingError } = await supabase
                .from("ready_stays")
                .update({
                  status: "sold",
                  sold_booking_request_id: bookingId,
                  locked_until: null,
                  lock_session_id: null,
                  updated_at: nowIso,
                })
                .eq("id", targetReadyStayId);
              if (readyStayByBookingError) {
                console.error("[stripe] ready_stays mark sold failed by booking_request_id", {
                  bookingId,
                  readyStayId: targetReadyStayId,
                  sessionId: session.id ?? null,
                  code: readyStayByBookingError.code,
                  message: readyStayByBookingError.message,
                  details: readyStayByBookingError.details,
                  hint: readyStayByBookingError.hint,
                });
              } else {
                readyStayIdMarked = targetReadyStayId;
              }
            }
          }

          if (process.env.NODE_ENV !== "production") {
            console.info(`[stripe] ready_stays marked sold readyStayId=${readyStayIdMarked ?? "unknown"}`);
          }

          try {
            await supabase
              .from("contracts")
              .update({
                status: "active",
                signed_at: nowIso,
                guest_accepted_at: nowIso,
                updated_at: nowIso,
              })
              .eq("booking_request_id", bookingId)
              .in("status", ["draft", "sent", "pending_payment"]);

            const { data: bookingForEmail } = await supabase
              .from("booking_requests")
              .select(
                "id, booking_package_emailed_at, lead_guest_name, lead_guest_email, lead_guest_phone, check_in, check_out, primary_room, total_points, requires_accessibility, comments",
              )
              .eq("id", bookingId)
              .maybeSingle();

            if (bookingForEmail && !bookingForEmail.booking_package_emailed_at) {
              const readyStayOrClauses: string[] = [];
              if (readyStayIdFromMetadata) readyStayOrClauses.push(`id.eq.${readyStayIdFromMetadata}`);
              readyStayOrClauses.push(`booking_request_id.eq.${bookingId}`);
              readyStayOrClauses.push(`sold_booking_request_id.eq.${bookingId}`);
              const { data: readyStayForEmail } = await supabase
                .from("ready_stays")
                .select(
                  "id, owner_id, resort_id, room_type, check_in, check_out, points, booking_request_id, sold_booking_request_id, lock_session_id, resorts(name)",
                )
                .or(readyStayOrClauses.join(","))
                .limit(1)
                .maybeSingle();

              if (readyStayForEmail?.owner_id) {
                let { data: ownerRecord } = await supabase
                  .from("owners")
                  .select("id, user_id, email, display_name, full_legal_name")
                  .eq("id", readyStayForEmail.owner_id)
                  .maybeSingle();

                if (!ownerRecord) {
                  const { data: fallbackOwner } = await supabase
                    .from("owners")
                    .select("id, user_id, email, display_name, full_legal_name")
                    .eq("user_id", readyStayForEmail.owner_id)
                    .maybeSingle();
                  ownerRecord = fallbackOwner ?? null;
                }

                const ownerProfile =
                  ownerRecord?.user_id
                    ? await supabase
                        .from("profiles")
                        .select("email")
                        .eq("id", ownerRecord.user_id)
                        .maybeSingle()
                    : { data: null };

                const ownerEmail = ownerRecord?.email ?? ownerProfile.data?.email ?? null;
                if (ownerEmail) {
                  const { data: guestRows } = await supabase
                    .from("booking_request_guests")
                    .select("first_name, last_name, age_category, age, email, phone")
                    .eq("booking_id", bookingId)
                    .order("created_at", { ascending: true });

                  const baseUrl =
                    process.env.NEXT_PUBLIC_SITE_URL ??
                    process.env.NEXT_PUBLIC_APP_URL ??
                    "http://localhost:3005";

                  await sendReadyStayBookingPackageToOwner({
                    to: ownerEmail,
                    ownerName:
                      ownerRecord?.full_legal_name ??
                      ownerRecord?.display_name ??
                      "Owner",
                    resortName: readyStayForEmail.resorts?.name ?? null,
                    roomType: readyStayForEmail.room_type ?? bookingForEmail.primary_room ?? null,
                    checkIn: readyStayForEmail.check_in ?? bookingForEmail.check_in ?? null,
                    checkOut: readyStayForEmail.check_out ?? bookingForEmail.check_out ?? null,
                    points:
                      Number(readyStayForEmail.points ?? bookingForEmail.total_points ?? 0) || null,
                    guestName: bookingForEmail.lead_guest_name ?? null,
                    guestEmail: bookingForEmail.lead_guest_email ?? null,
                    guestPhone: bookingForEmail.lead_guest_phone ?? null,
                    accessibilityRequired: Boolean(bookingForEmail.requires_accessibility),
                    notes: bookingForEmail.comments ?? null,
                    guests:
                      (guestRows ?? []).map((guest) => ({
                        name: [guest.first_name, guest.last_name].filter(Boolean).join(" ").trim(),
                        ageCategory: guest.age_category ?? null,
                        age: guest.age ?? null,
                        email: guest.email ?? null,
                        phone: guest.phone ?? null,
                      })) ?? [],
                    transferUrl: `${baseUrl.replace(/\/$/, "")}/owner/ready-stays`,
                  });

                  await supabase
                    .from("booking_requests")
                    .update({
                      booking_package_emailed_at: nowIso,
                      updated_at: nowIso,
                    })
                    .eq("id", bookingId)
                    .is("booking_package_emailed_at", null);
                } else {
                  throw new Error("Owner email is missing for ready stay booking package");
                }
              } else {
                throw new Error("Ready stay owner was not found for booking package email");
              }
            }
          } catch (err) {
            console.error("[ready-stays] downstream full-payment processing failed", {
              bookingRequestId: bookingId,
              contractId,
              readyStayId: readyStayIdFromMetadata,
              sessionId: session.id ?? null,
              error: err instanceof Error ? err.message : String(err),
            });
            return NextResponse.json(
              { ok: true, warning: "full_payment_downstream_failed", bookingRequestId: bookingId },
              { status: 200 },
            );
          }
        }

        if (paymentType !== "full") {
          await supabase
            .from("ready_stays")
            .update({
              status: "sold",
              locked_until: null,
              lock_session_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("lock_session_id", bookingId);
        }

        if (process.env.NODE_ENV !== "production") {
          console.info("[stripe/webhook] update", {
            booking_request_id: bookingId,
            updated: Boolean(data),
            error: Boolean(error),
          });
        }

        // Enrollment is explicit (user-driven) and no longer automatic here.
      }

      if (process.env.NODE_ENV !== "production") {
        console.info("[stripe/webhook] deposit paid", {
          booking_request_id: bookingId,
          amount_paid: amountPaid,
        });
      }
    } else if (paymentType === "full" && process.env.NODE_ENV !== "production") {
      console.warn("[stripe] full payment skipped", {
        booking_request_id: bookingId,
        payment_status: session.payment_status ?? null,
        status: session.status ?? null,
        session_id: session.id ?? null,
      });
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    const bookingId =
      session.metadata?.booking_request_id ??
      session.client_reference_id ??
      session.metadata?.booking_id ??
      null;

    if (bookingId) {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase
          .from("ready_stays")
          .update({
            locked_until: null,
            lock_session_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("lock_session_id", bookingId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
