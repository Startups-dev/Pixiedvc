import { getAccountNavigation } from "@/lib/navigation";
import HeaderClient from "@/components/header-client";

export default async function Header() {
  const navigation = await getAccountNavigation();
  return (
    <HeaderClient
      userLabel={navigation?.label ?? null}
      isAdmin={Boolean(navigation?.dashboards.some((item) => item.id === "admin"))}
      isAuthenticated={Boolean(navigation)}
      dashboards={navigation?.dashboards ?? []}
    />
  );
}
