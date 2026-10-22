
import { redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";
import { hasSchoolAccess } from "@/lib/school-activation";

export async function requireActiveSchoolAdministrator() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  // Platform administrators manage schools and their activation.
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

  if (!hasSchoolAccess(school)) {
    redirect("/admin");
  }

  return administrator;
}
