import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/teacher-session";

export async function GET(request: Request) {
  try {
    const teacher = await getCurrentTeacher();

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher sign-in is required" },
        { status: 401 },
      );
    }

    if (!teacher.schoolId) {
      return NextResponse.json(
        {
          error:
            "Your teacher account is not assigned to a school",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const examinationId =
      searchParams.get("examinationId");

    /*
     * ---------------------------------------------------------
     * MODE 1: SCHOOL-WIDE EXAMINATION LIST
     * ---------------------------------------------------------
     *
     * This mode is used by the Final Grade Results dropdown.
     *
     * IMPORTANT:
     * Teachers are allowed to VIEW final results for every
     * grade in their own school.
     *
     * This does NOT give them permission to enter marks.
     * Mark entry remains protected by /api/teacher-results.
     */
    if (!examinationId) {
      const examinations =
        await prisma.examination.findMany({
          where: {
            grade: {
              schoolId: teacher.schoolId,
            },
          },
          select: {
            id: true,
            name: true,
            gradeId: true,
            grade: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
            term: {
              select: {
                id: true,
                name: true,
                academicYear: {
                  select: {
                    id: true,
                    year: true,
                  },
                },
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        });

      return NextResponse.json({
        examinations,
      });
    }

    /*
     * ---------------------------------------------------------
     * MODE 2: COMPLETE FINAL RESULTS
     * ---------------------------------------------------------
     *
     * The selected examination must belong to the teacher's
     * authenticated school.
     */
    const examination =
      await prisma.examination.findFirst({
        where: {
          id: examinationId,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
        select: {
          id: true,
          name: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
              level: true,
              schoolId: true,
            },
          },
          term: {
            select: {
              id: true,
              name: true,
              academicYear: {
                select: {
                  id: true,
                  year: true,
                },
              },
            },
          },
        },
      });

    if (!examination) {
      return NextResponse.json(
        {
          error:
            "The selected examination was not found in your school",
        },
        { status: 404 },
      );
    }

    /*
     * These queries are independent after the examination
     * has been verified, so run them concurrently.
     */
    const [
      gradeSubjects,
      students,
      results,
    ] = await Promise.all([
      prisma.gradeSubject.findMany({
        where: {
          gradeId: examination.gradeId,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
        select: {
          subjectId: true,
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      }),

      prisma.student.findMany({
        where: {
          gradeId: examination.gradeId,
          schoolId: teacher.schoolId,
        },
        select: {
          id: true,
          name: true,
          admissionNumber: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.result.findMany({
        where: {
          examinationId,
          student: {
            gradeId: examination.gradeId,
            schoolId: teacher.schoolId,
          },
          examination: {
            grade: {
              schoolId: teacher.schoolId,
            },
          },
        },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          marks: true,
        },
      }),
    ]);

    return NextResponse.json({
      examination,
      subjects: gradeSubjects.map(
        (gradeSubject) => ({
          subjectId:
            gradeSubject.subjectId,
          subjectName:
            gradeSubject.subject.name,
        }),
      ),
      students,
      results,
    });
  } catch (error) {
    console.error(
      "Teacher final results error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load teacher final results",
      },
      { status: 500 },
    );
  }
}