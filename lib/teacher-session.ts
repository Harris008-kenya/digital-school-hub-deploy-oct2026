import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const TEACHER_SESSION_COOKIE = "dsh_teacher_session";

export async function getCurrentTeacher() {
  const token = (await cookies()).get(TEACHER_SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await prisma.teacherSession.findUnique({
    where: { token },
    include: {
      teacher: {
        include: {
          school: true,
          assignments: {
            include: {
              grade: true,
              subject: true,
            },
            orderBy: [
              { grade: { level: "asc" } },
              { subject: { name: "asc" } },
            ],
          },
          classTeacherAssignments: {
            include: {
              grade: true,
            },
            orderBy: {
              grade: { level: "asc" },
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  const now = new Date();

  if (session.expiresAt <= now) {
    await prisma.teacherSession.delete({
      where: { id: session.id },
    });

    return null;
  }

  const school = session.teacher.school;

  const activationExpired =
    school.activationExpiryDate !== null &&
    school.activationExpiryDate < now;

  if (!school.isActive || activationExpired) {
    await prisma.teacherSession.delete({
      where: { id: session.id },
    });

    return null;
  }

  return session.teacher;
}