
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hasSchoolAccess } from "@/lib/school-activation";

export const PARENT_SESSION_COOKIE =
  "dsh_parent_session";

const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_MS =
  SESSION_DURATION_DAYS *
  24 *
  60 *
  60 *
  1000;

export async function createParentSession(
  parentAccountId: string,
) {
  const token = randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_MS,
  );

  await prisma.parentSession.create({
    data: {
      token,
      parentAccountId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(PARENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getCurrentParent() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(PARENT_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session =
    await prisma.parentSession.findUnique({
      where: {
        token,
      },
      select: {
        id: true,
        expiresAt: true,

        parentAccount: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
                activationExpiryDate: true,
              },
            },

            contacts: {
              select: {
                parentContact: {
                  select: {
                    id: true,
                    studentId: true,
                    relationship: true,

                    student: {
                      select: {
                        id: true,
                        name: true,
                        admissionNumber: true,
                        schoolId: true,
                        gradeId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!session) {
    return null;
  }

  const now = new Date();

  if (session.expiresAt <= now) {
    await prisma.parentSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  const school = session.parentAccount.school;

  if (!hasSchoolAccess(school, now)) {
    await prisma.parentSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.parentAccount;
}

export async function destroyParentSession() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(PARENT_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.parentSession.deleteMany({
      where: {
        token,
      },
    });
  }

  cookieStore.delete(PARENT_SESSION_COOKIE);
}
