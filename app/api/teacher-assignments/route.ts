import { NextResponse } from "next/server";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const access =
      await getActiveSchoolAdministrator();

    if (!access.administrator) {
      return NextResponse.json(
        {
          error: access.error,
        },
        { status: access.status },
      );
    }

    if (access.administrator.role !== "SCHOOL") {
      return NextResponse.json(
        {
          error:
            "Platform Administrators cannot use this school management endpoint",
        },
        { status: 403 },
      );
    }

    if (!access.school) {
      return NextResponse.json(
        {
          error: "Your school was not found",
        },
        { status: 404 },
      );
    }

    const school = access.school;

    const body = await request.json();

    const teacherId =
      typeof body.teacherId === "string"
        ? body.teacherId
        : "";

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId
        : "";

    const subjectId =
      typeof body.subjectId === "string"
        ? body.subjectId
        : "";

    if (!teacherId || !gradeId || !subjectId) {
      return NextResponse.json(
        {
          error:
            "Teacher, grade and subject are required",
        },
        { status: 400 },
      );
    }

    const [teacher, gradeSubject] =
      await Promise.all([
        prisma.teacher.findFirst({
          where: {
            id: teacherId,
            schoolId: school.id,
          },
        }),

        prisma.gradeSubject.findUnique({
          where: {
            gradeId_subjectId: {
              gradeId,
              subjectId,
            },
          },
          include: {
            grade: true,
            subject: true,
          },
        }),
      ]);

    if (!teacher) {
      return NextResponse.json(
        {
          error:
            "The selected teacher was not found in your school",
        },
        { status: 404 },
      );
    }

    if (!gradeSubject) {
      return NextResponse.json(
        {
          error:
            "Assign the subject to this grade before assigning a teacher",
        },
        { status: 400 },
      );
    }

    if (gradeSubject.grade.schoolId !== school.id) {
      return NextResponse.json(
        {
          error:
            "The selected grade does not belong to your school",
        },
        { status: 403 },
      );
    }

    const assignment =
      await prisma.teacherAssignment.upsert({
        where: {
          teacherId_gradeId_subjectId: {
            teacherId,
            gradeId,
            subjectId,
          },
        },
        update: {},
        create: {
          teacherId,
          gradeId,
          subjectId,
        },
        include: {
          grade: true,
          subject: true,
        },
      });

    return NextResponse.json(
      assignment,
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error assigning teacher:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to assign teacher",
      },
      { status: 500 },
    );
  }
}