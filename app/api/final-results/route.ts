import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/teacher-session";

export async function GET(request: Request) {
  try {
    // Only signed-in teachers may access the final results API.
    const teacher = await getCurrentTeacher();

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher sign-in is required" },
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

    const searchParams =
      new URL(request.url).searchParams;

    const examinationId =
      searchParams.get("examinationId") || "";

    const gradeId =
      searchParams.get("gradeId") || "";

    if (!examinationId || !gradeId) {
      return NextResponse.json(
        {
          error:
            "examinationId and gradeId are required",
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error:
            "The selected examination was not found",
        },
        { status: 404 }
      );
    }

    if (
      examination.grade.schoolId !==
      teacher.schoolId
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to access this examination",
        },
        { status: 403 }
      );
    }

    if (examination.gradeId !== gradeId) {
      return NextResponse.json(
        {
          error:
            "The examination does not belong to the selected grade",
        },
        { status: 400 }
      );
    }

    const grade =
      await prisma.grade.findFirst({
        where: {
          id: gradeId,
          schoolId: teacher.schoolId,
        },
      });

    if (!grade) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to access this grade",
        },
        { status: 403 }
      );
    }

    const gradeSubjects =
      await prisma.gradeSubject.findMany({
        where: {
          gradeId: grade.id,
        },
        include: {
          subject: true,
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      });

    const students =
      await prisma.student.findMany({
        where: {
          gradeId: grade.id,
          schoolId: teacher.schoolId,
        },
        orderBy: {
          name: "asc",
        },
      });

    const results =
      await prisma.result.findMany({
        where: {
          examinationId,
          student: {
            gradeId: grade.id,
            schoolId: teacher.schoolId,
          },
        },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          marks: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
      },
      examination,
      gradeSubjects,
      students,
      results,
    });
  } catch (error) {
    console.error(
      "Error fetching protected final results:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch final results",
      },
      { status: 500 }
    );
  }
}