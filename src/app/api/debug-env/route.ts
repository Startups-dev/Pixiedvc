import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "missing",
    ANON_PRESENT: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SERVICE_ROLE_PRESENT: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY_PRESENT: !!process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "missing"
  });
}
