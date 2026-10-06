import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";

export async function getActiveSchoolAdministrator() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    return {
      administrator: null,
      error: "Administrator sign-in is required",
      status: 401,
    };
  }

  if (administrator.role === "PLATFORM") {
    return {
      administrator,
      error: null,
      status: 200,
    };
  }

  if (!administrator.schoolId) {
    return {
      administrator: null,
      error: "Your administrator account is not assigned to a school",
      status: 403,
    };
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
    return {
      administrator: null,
      error: "Your school was not found",
      status: 404,
    };
  }

  const now = new Date();

  const isExpired =
    school.activationExpiryDate !== null &&
    school.activationExpiryDate < now;

  if (!school.isActive || isExpired) {
    return {
      administrator: null,
      error:
        "Your school is inactive or its activation has expired. Activate the school before accessing school records.",
      status: 403,
    };
  }

  return {
    administrator,
    school,
    error: null,
    status: 200,
  };
}