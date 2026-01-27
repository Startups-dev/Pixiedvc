import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

function hasSpamLinks(value: string) {
  const lower = value.toLowerCase();
  return lower.includes("http") || lower.includes("www") || lower.includes("://");
}

function hasExcessivePunctuation(value: string) {
  return /!{5,}|\?{5,}/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json();
  const quote = String(body?.quote ?? "").trim();
  const author = String(body?.author ?? "").trim();
  const location = String(body?.location ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const consent = Boolean(body?.consent);

  if (!consent) {
    return NextResponse.json({ ok: false, error: "Consent is required to submit." }, { status: 400 });
  }

  if (quote.length < 20 || quote.length > 500) {
    return NextResponse.json({ ok: false, error: "Testimonial must be 20–500 characters." }, { status: 400 });
  }

  if (author.length < 2 || author.length > 60) {
    return NextResponse.json({ ok: false, error: "Name must be 2–60 characters." }, { status: 400 });
  }

  if (location.length < 2 || location.length > 60) {
    return NextResponse.json({ ok: false, error: "Location must be 2–60 characters." }, { status: 400 });
  }

  if (hasSpamLinks(quote)) {
    return NextResponse.json({ ok: false, error: "Please remove links from your testimonial." }, { status: 400 });
  }

  if (hasExcessivePunctuation(quote)) {
    return NextResponse.json({ ok: false, error: "Please reduce excessive punctuation." }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.from("testimonial_submissions").insert({
    quote,
    author,
    location,
    email: email || null,
    consent,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Unable to submit at this time." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
