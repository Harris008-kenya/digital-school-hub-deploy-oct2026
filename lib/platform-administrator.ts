import { redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";

export async function requirePlatformAdministrator() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  if (administrator.role !== "PLATFORM") {
    redirect("/admin");
  }

  return administrator;
}