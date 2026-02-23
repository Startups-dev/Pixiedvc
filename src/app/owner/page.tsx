import { redirect } from "next/navigation";

import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";

export default async function OwnerPage() {
  await requireOwnerAccess("/owner");
  redirect("/owner/dashboard");
}
