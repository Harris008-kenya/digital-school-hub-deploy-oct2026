
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hasSchoolAccess } from "@/lib/school-activation";

export const TEACHER_SESSION_COOKIE = "dsh_teacher_session";

export async function getCurrentTeacher() {
  const token = (await cookies()).get(TEACHER_SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await prisma.teacherSession.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,

      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          schoolId: true,

          school: {
            select: {
              id: true,
              name: true,
              isActive: true,
              activationExpiryDate: true,
            },
          },

          assignments: {
            select: {
              id: true,
              gradeId: true,
              subjectId: true,

              grade: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                  schoolId: true,
                },
              },

              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },

            orderBy: [
              { grade: { level: "asc" } },
              { subject: { name: "asc" } },
            ],
          },

          classTeacherAssignments: {
            select: {
              id: true,
              gradeId: true,

              grade: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                  schoolId: true,
                },
              },
            },

            orderBy: {
              grade: {
                level: "asc",
              },
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

  if (!hasSchoolAccess(school, now)) {
    await prisma.teacherSession.delete({
      where: { id: session.id },
    });

    return null;
  }

  return session.teacher;
}
