import { redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";

export async function requireActiveSchoolAdministrator() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  if (administrator.role === "PLATFORM") {
    return administrator;
  }

  if (!administrator.schoolId) {
    redirect("/admin");
  }

  const school = await prisma.school.findUnique({
    where: {
      id: administrator.schoolId,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      activationExpiryDate: true,
    },
  });

  if (!school) {
    redirect("/admin");
  }

  const now = new Date();

  const isExpired =
    school.activationExpiryDate !== null &&
    school.activationExpiryDate < now;

  if (!school.isActive || isExpired) {
    redirect("/admin");
  }

  return administrator;
}