import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/teacher-session";

type ResultInput = {
  studentId?: unknown;
  marks?: unknown;
};

async function getTeacherExaminationAccess(
  examinationId: string,
  subjectId: string
) {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    return {
      error: "Teacher sign-in is required",
      status: 401,
    };
  }

  if (!teacher.schoolId) {
    return {
      error:
        "Your teacher account is not assigned to a school",
      status: 403,
    };
  }

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
    return {
      error:
        "The selected examination was not found in your school",
      status: 404,
    };
  }

  const assignment = teacher.assignments.find(
    (item) =>
      item.gradeId === examination.gradeId &&
      item.subjectId === subjectId
  );

  if (!assignment) {
    return {
      error:
        "You are not assigned to this subject and grade",
      status: 403,
    };
  }

  return {
    teacher,
    examination,
    assignment,
  };
}

export async function GET(request: Request) {
  const searchParams =
    new URL(request.url).searchParams;

  const examinationId =
    searchParams.get("examinationId") || "";

  const subjectId =
    searchParams.get("subjectId") || "";

  try {
    /*
     * Initial page load:
     * Return the teacher's assignments and examinations
     * for grades where the teacher has assignments.
     */
    if (!examinationId && !subjectId) {
      const teacher = await getCurrentTeacher();

      if (!teacher) {
        return NextResponse.json(
          {
            error: "Teacher sign-in is required",
          },
          { status: 401 }
        );
      }

      if (!teacher.schoolId) {
        return NextResponse.json(
          {
            error:
              "Your teacher account is not assigned to a school",
          },
          { status: 403 }
        );
      }

      const gradeIds = [
        ...new Set(
          teacher.assignments.map(
            (assignment) =>
              assignment.gradeId
          )
        ),
      ];

      if (gradeIds.length === 0) {
        return NextResponse.json({
          teacher: {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            assignments: [],
          },
          examinations: [],
        });
      }

      const examinations =
        await prisma.examination.findMany({
          where: {
            gradeId: {
              in: gradeIds,
            },
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
          orderBy: {
            createdAt: "desc",
          },
        });

      const assignments =
        teacher.assignments.map(
          (assignment) => ({
            id: assignment.id,
            teacherId: teacher.id,
            gradeId: assignment.gradeId,
            subjectId: assignment.subjectId,
            grade: {
              id: assignment.grade.id,
              name: assignment.grade.name,
              level: assignment.grade.level,
            },
            subject: {
              id: assignment.subject.id,
              name: assignment.subject.name,
            },
          })
        );

      return NextResponse.json({
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          assignments,
        },
        examinations,
      });
    }

    /*
     * Both parameters are required for a marks sheet.
     */
    if (!examinationId || !subjectId) {
      return NextResponse.json(
        {
          error:
            "examinationId and subjectId are required together",
        },
        { status: 400 }
      );
    }

    const access =
      await getTeacherExaminationAccess(
        examinationId,
        subjectId
      );

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    /*
     * Load learners and existing marks in parallel.
     * Both queries are restricted to the teacher's school
     * and the examination grade.
     */
    const [students, results] =
      await Promise.all([
        prisma.student.findMany({
          where: {
            schoolId:
              access.teacher.schoolId,
            gradeId:
              access.examination.gradeId,
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
            subjectId,
            student: {
              schoolId:
                access.teacher.schoolId,
              gradeId:
                access.examination.gradeId,
            },
          },
          select: {
            id: true,
            studentId: true,
            marks: true,
          },
        }),
      ]);

    const resultsByStudent =
      new Map(
        results.map((result) => [
          result.studentId,
          result,
        ])
      );

    return NextResponse.json({
      examination: access.examination,

      subject: {
        id: access.assignment.subject.id,
        name: access.assignment.subject.name,
      },

      students: students.map(
        (student) => ({
          student,
          result:
            resultsByStudent.get(
              student.id
            ) ?? null,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Error fetching teacher results:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch results sheet",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const examinationId =
      typeof body.examinationId === "string"
        ? body.examinationId
        : "";

    const subjectId =
      typeof body.subjectId === "string"
        ? body.subjectId
        : "";

    const entries = Array.isArray(body.results)
      ? (body.results as ResultInput[])
      : [];

    if (
      !examinationId ||
      !subjectId ||
      entries.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "An examination, subject and at least one mark are required",
        },
        { status: 400 }
      );
    }

    /*
     * This is the critical server-side authorization check.
     * It verifies:
     * - teacher session
     * - teacher school
     * - examination belongs to teacher's school
     * - teacher is assigned to this grade + subject
     */
    const access =
      await getTeacherExaminationAccess(
        examinationId,
        subjectId
      );

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const marksByStudent =
      new Map<string, number>();

    for (const entry of entries) {
      const studentId =
        typeof entry.studentId === "string"
          ? entry.studentId.trim()
          : "";

      const marks =
        typeof entry.marks === "number"
          ? entry.marks
          : Number.NaN;

      if (
        !studentId ||
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Each mark must be a number from 0 to 100",
          },
          { status: 400 }
        );
      }

      /*
       * If a student appears twice in the request,
       * the last value is used.
       */
      marksByStudent.set(
        studentId,
        marks
      );
    }

    const studentIds = [
      ...marksByStudent.keys(),
    ];

    /*
     * Verify every submitted learner belongs to:
     * - this school
     * - the examination's grade
     */
    const students =
      await prisma.student.findMany({
        where: {
          id: {
            in: studentIds,
          },
          schoolId:
            access.teacher.schoolId,
          gradeId:
            access.examination.gradeId,
        },
        select: {
          id: true,
        },
      });

    if (
      students.length !==
      studentIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more learners do not belong to this examination grade and school",
        },
        { status: 400 }
      );
    }

    /*
     * Create new results or update existing results.
     * The unique combination prevents duplicate result
     * records for the same learner, subject and examination.
     */
    await prisma.$transaction(
      studentIds.map((studentId) =>
        prisma.result.upsert({
          where: {
            studentId_subjectId_examinationId:
              {
                studentId,
                subjectId,
                examinationId,
              },
          },

          update: {
            marks:
              marksByStudent.get(
                studentId
              )!,
            teacherId:
              access.teacher.id,
          },

          create: {
            studentId,
            subjectId,
            examinationId,
            teacherId:
              access.teacher.id,
            marks:
              marksByStudent.get(
                studentId
              )!,
          },
        })
      )
    );

    return NextResponse.json({
      saved: studentIds.length,
    });
  } catch (error) {
    console.error(
      "Error saving teacher results:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save results",
      },
      { status: 500 }
    );
  }
}