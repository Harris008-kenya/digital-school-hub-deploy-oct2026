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
    await prisma.examination.findUnique({
      where: {
        id: examinationId,
      },
      include: {
        grade: true,
        term: {
          include: {
            academicYear: true,
          },
        },
      },
    });

  if (!examination) {
    return {
      error:
        "The selected examination was not found",
      status: 404,
    };
  }

  if (
    examination.grade.schoolId !==
    teacher.schoolId
  ) {
    return {
      error:
        "You are not authorized to access this examination",
      status: 403,
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
    if (!examinationId && !subjectId) {
      const teacher = await getCurrentTeacher();

      if (!teacher) {
        return NextResponse.json(
          {
            error:
              "Teacher sign-in is required",
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
          include: {
            grade: true,
            term: {
              include: {
                academicYear: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return NextResponse.json({
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          assignments:
            teacher.assignments,
        },
        examinations,
      });
    }

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

    const [students, results] =
      await Promise.all([
        prisma.student.findMany({
          where: {
            gradeId:
              access.examination.gradeId,
            schoolId:
              access.teacher.schoolId,
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
            },
          },
          select: {
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
      subject: access.assignment.subject,
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
          ? entry.studentId
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

      marksByStudent.set(
        studentId,
        marks
      );
    }

    const studentIds = [
      ...marksByStudent.keys(),
    ];

    const students =
      await prisma.student.findMany({
        where: {
          id: {
            in: studentIds,
          },
          gradeId:
            access.examination.gradeId,
          schoolId:
            access.teacher.schoolId,
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