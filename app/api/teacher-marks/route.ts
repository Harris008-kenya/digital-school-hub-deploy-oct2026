import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { prisma } from "@/lib/prisma";

type MarkEntry = {
  studentId: string;
  marks: number;
};

async function getTeacher() {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    return null;
  }

  return teacher;
}

// GET: Load students and existing marks for a teacher's assigned
// Grade + Subject + Examination.
export async function GET(request: Request) {
  try {
    const teacher = await getTeacher();

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
            "Your teacher account is not assigned to a school.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    const assignmentId =
      searchParams.get("assignmentId")?.trim() || "";

    const examinationId =
      searchParams.get("examinationId")?.trim() || "";

    if (!assignmentId || !examinationId) {
      return NextResponse.json(
        {
          error:
            "assignmentId and examinationId are required",
        },
        { status: 400 },
      );
    }

    // Make sure this assignment belongs to the signed-in teacher
    // and belongs to the teacher's school.
    const assignment =
      await prisma.teacherAssignment.findFirst({
        where: {
          id: assignmentId,
          teacherId: teacher.id,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
        include: {
          grade: true,
          subject: true,
          teacher: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!assignment) {
      return NextResponse.json(
        {
          error:
            "This teaching assignment does not belong to you or your school.",
        },
        { status: 403 },
      );
    }

    // The examination must belong to the assigned grade
    // and the teacher's school.
    const examination =
      await prisma.examination.findFirst({
        where: {
          id: examinationId,
          gradeId: assignment.gradeId,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
        include: {
          term: {
            include: {
              academicYear: true,
            },
          },
          grade: true,
        },
      });

    if (!examination) {
      return NextResponse.json(
        {
          error:
            "The selected examination does not belong to your assigned grade or school.",
        },
        { status: 404 },
      );
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: teacher.schoolId,
        gradeId: assignment.gradeId,
      },
      orderBy: [
        {
          name: "asc",
        },
      ],
    });

    const studentIds = students.map(
      (student) => student.id,
    );

    const results = await prisma.result.findMany({
      where: {
        examinationId,
        subjectId: assignment.subjectId,
        studentId: {
          in: studentIds,
        },
        student: {
          schoolId: teacher.schoolId,
          gradeId: assignment.gradeId,
        },
      },
      select: {
        id: true,
        studentId: true,
        marks: true,
        updatedAt: true,
      },
    });

    const resultMap = new Map(
      results.map((result) => [
        result.studentId,
        result,
      ]),
    );

    const studentRows = students.map((student) => {
      const result = resultMap.get(student.id);

      return {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        marks: result?.marks ?? null,
        resultId: result?.id ?? null,
        updatedAt: result?.updatedAt ?? null,
      };
    });

    return NextResponse.json({
      teacher: assignment.teacher,
      assignment: {
        id: assignment.id,
        grade: assignment.grade,
        subject: assignment.subject,
      },
      examination,
      students: studentRows,
    });
  } catch (error) {
    console.error(
      "Error loading teacher marks:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load teacher marks information",
      },
      { status: 500 },
    );
  }
}

// POST: Save marks entered by a teacher.
export async function POST(request: Request) {
  try {
    const teacher = await getTeacher();

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
            "Your teacher account is not assigned to a school.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const assignmentId =
      typeof body.assignmentId === "string"
        ? body.assignmentId.trim()
        : "";

    const examinationId =
      typeof body.examinationId === "string"
        ? body.examinationId.trim()
        : "";

    const marks =
      Array.isArray(body.marks)
        ? (body.marks as MarkEntry[])
        : [];

    if (!assignmentId || !examinationId) {
      return NextResponse.json(
        {
          error:
            "assignmentId and examinationId are required",
        },
        { status: 400 },
      );
    }

    if (!marks.length) {
      return NextResponse.json(
        {
          error:
            "At least one student's mark is required",
        },
        { status: 400 },
      );
    }

    // Verify that the assignment belongs to this teacher
    // and belongs to the teacher's school.
    const assignment =
      await prisma.teacherAssignment.findFirst({
        where: {
          id: assignmentId,
          teacherId: teacher.id,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
      });

    if (!assignment) {
      return NextResponse.json(
        {
          error:
            "This teaching assignment does not belong to you or your school.",
        },
        { status: 403 },
      );
    }

    // Verify that the examination belongs to the
    // assigned grade and teacher's school.
    const examination =
      await prisma.examination.findFirst({
        where: {
          id: examinationId,
          gradeId: assignment.gradeId,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
      });

    if (!examination) {
      return NextResponse.json(
        {
          error:
            "The selected examination does not belong to your assigned grade or school.",
        },
        { status: 404 },
      );
    }

    // Verify all students belong to the same school
    // and assigned grade.
    const studentIds = marks.map(
      (entry) => entry.studentId,
    );

    const students = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
        schoolId: teacher.schoolId,
        gradeId: assignment.gradeId,
      },
      select: {
        id: true,
      },
    });

    const validStudentIds = new Set(
      students.map((student) => student.id),
    );

    for (const entry of marks) {
      if (
        typeof entry.studentId !== "string" ||
        !validStudentIds.has(entry.studentId)
      ) {
        return NextResponse.json(
          {
            error:
              "One or more students are not valid for this teaching assignment.",
          },
          { status: 400 },
        );
      }

      if (
        typeof entry.marks !== "number" ||
        !Number.isFinite(entry.marks)
      ) {
        return NextResponse.json(
          {
            error:
              "Marks must be valid numbers.",
          },
          { status: 400 },
        );
      }

      if (entry.marks < 0 || entry.marks > 100) {
        return NextResponse.json(
          {
            error:
              "Marks must be between 0 and 100.",
          },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(
      marks.map((entry) =>
        prisma.result.upsert({
          where: {
            studentId_subjectId_examinationId: {
              studentId: entry.studentId,
              subjectId: assignment.subjectId,
              examinationId,
            },
          },
          update: {
            marks: entry.marks,
            teacherId: teacher.id,
          },
          create: {
            studentId: entry.studentId,
            subjectId: assignment.subjectId,
            examinationId,
            teacherId: teacher.id,
            marks: entry.marks,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message: `${marks.length} student mark${
        marks.length === 1 ? "" : "s"
      } saved successfully.`,
    });
  } catch (error) {
    console.error(
      "Error saving teacher marks:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save teacher marks",
      },
      { status: 500 },
    );
  }
}