import { NextResponse } from "next/server";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const access = await getActiveSchoolAdministrator();

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

    if (!teacherId || !gradeId) {
      return NextResponse.json(
        {
          error:
            "Teacher and grade are required",
        },
        { status: 400 },
      );
    }

    const [teacher, grade] =
      await Promise.all([
        prisma.teacher.findFirst({
          where: {
            id: teacherId,
            schoolId: school.id,
          },
        }),

        prisma.grade.findFirst({
          where: {
            id: gradeId,
            schoolId: school.id,
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

    if (!grade) {
      return NextResponse.json(
        {
          error:
            "The selected grade was not found in your school",
        },
        { status: 404 },
      );
    }

    const assignment =
      await prisma.classTeacherAssignment.upsert({
        where: {
          gradeId,
        },
        update: {
          teacherId,
        },
        create: {
          teacherId,
          gradeId,
        },
        include: {
          teacher: true,
          grade: true,
        },
      });

    return NextResponse.json(
      assignment,
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error assigning class teacher:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to assign class teacher",
      },
      { status: 500 },
    );
  }
}