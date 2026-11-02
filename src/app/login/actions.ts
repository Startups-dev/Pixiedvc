"use server";

import { resolveAccountNavigation } from "@/lib/navigation";
import { getLoginDestination } from "@/lib/routes/home";

export async function getPostLoginDestination(requested: string | null) {
  return getLoginDestination(await resolveAccountNavigation(), requested);
}
