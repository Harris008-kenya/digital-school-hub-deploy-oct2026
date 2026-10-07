import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const STUDENT_SESSION_COOKIE =
  "dsh_student_session";

export async function getCurrentStudent() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(STUDENT_SESSION_COOKIE)?.value;

  if (!token) return null;

  const session =
    await prisma.studentSession.findUnique({
      where: {
        token,
      },
      select: {
        id: true,
        expiresAt: true,
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            schoolId: true,
            gradeId: true,

            school: {
              select: {
                id: true,
                name: true,
                isActive: true,
                activationExpiryDate: true,
              },
            },

            grade: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });

  if (!session) return null;

  const now = new Date();

  if (session.expiresAt <= now) {
    await prisma.studentSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  const school = session.student.school;

  const activationExpired =
    school.activationExpiryDate !== null &&
    school.activationExpiryDate < now;

  if (!school.isActive || activationExpired) {
    await prisma.studentSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.student;
}