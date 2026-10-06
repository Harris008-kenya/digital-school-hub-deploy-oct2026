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
    const examinationId = searchParams.get("examinationId");

    if (!examinationId) {
      return NextResponse.json(
        { error: "Examination ID is required" },
        { status: 400 },
      );
    }

    const examination = await prisma.examination.findFirst({
      where: {
        id: examinationId,
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

    const gradeAssignment = teacher.assignments.find(
      (assignment) =>
        assignment.gradeId === examination.gradeId &&
        assignment.grade.schoolId === teacher.schoolId,
    );

    if (!gradeAssignment) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this grade and cannot view its complete results.",
        },
        { status: 403 },
      );
    }

    const gradeSubjects = await prisma.gradeSubject.findMany({
      where: {
        gradeId: examination.gradeId,
        grade: {
          schoolId: teacher.schoolId,
        },
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

    const students = await prisma.student.findMany({
      where: {
        gradeId: examination.gradeId,
        schoolId: teacher.schoolId,
        grade: {
          schoolId: teacher.schoolId,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const results = await prisma.result.findMany({
      where: {
        examinationId,
        student: {
          gradeId: examination.gradeId,
          schoolId: teacher.schoolId,
          grade: {
            schoolId: teacher.schoolId,
          },
        },
        examination: {
          grade: {
            schoolId: teacher.schoolId,
          },
        },
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json({
      examination,
      subjects: gradeSubjects.map((gradeSubject) => ({
        subjectId: gradeSubject.subjectId,
        subjectName: gradeSubject.subject.name,
      })),
      students,
      results,
    });
  } catch (error) {
    console.error("Teacher final results error:", error);

    return NextResponse.json(
      { error: "Failed to load complete final results" },
      { status: 500 },
    );
  }
}