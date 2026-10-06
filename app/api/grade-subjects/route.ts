import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const gradeId =
    new URL(request.url).searchParams.get("gradeId");

  if (!gradeId) {
    return NextResponse.json(
      { error: "gradeId is required" },
      { status: 400 },
    );
  }

  try {
    const administrator =
      await getCurrentAdministrator();

    if (administrator) {
      if (administrator.role === "PLATFORM") {
        const grade = await prisma.grade.findUnique({
          where: { id: gradeId },
        });

        if (!grade) {
          return NextResponse.json(
            { error: "The selected grade was not found" },
            { status: 404 },
          );
        }
      } else {
        const access =
          await getActiveSchoolAdministrator();

        if (!access.administrator) {
          return NextResponse.json(
            { error: access.error },
            { status: access.status },
          );
        }

        if (!access.school) {
          return NextResponse.json(
            { error: "Your school was not found" },
            { status: 404 },
          );
        }

        const grade = await prisma.grade.findFirst({
          where: {
            id: gradeId,
            schoolId: access.school.id,
          },
        });

        if (!grade) {
          return NextResponse.json(
            {
              error:
                "You are not authorized to access this grade",
            },
            { status: 403 },
          );
        }
      }
    } else {
      const teacher = await getCurrentTeacher();

      if (!teacher) {
        return NextResponse.json(
          {
            error:
              "Administrator or teacher sign-in is required",
          },
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

      const grade = await prisma.grade.findFirst({
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
          { status: 403 },
        );
      }

      const assignedToGrade =
        teacher.assignments.some(
          (assignment) =>
            assignment.gradeId === gradeId,
        );

      if (!assignedToGrade) {
        return NextResponse.json(
          {
            error:
              "You are not assigned to this grade",
          },
          { status: 403 },
        );
      }
    }

    const gradeSubjects =
      await prisma.gradeSubject.findMany({
        where: {
          gradeId,
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
        include: {
          subject: true,
        },
      });

    return NextResponse.json(gradeSubjects);
  } catch (error) {
    console.error(
      "Error fetching grade subjects:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch grade subjects",
      },
      { status: 500 },
    );
  }
}

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
        { error: "Your school was not found" },
        { status: 404 },
      );
    }

    const school = access.school;

    const body = await request.json();

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId
        : "";

    const subjectId =
      typeof body.subjectId === "string"
        ? body.subjectId
        : "";

    if (!gradeId || !subjectId) {
      return NextResponse.json(
        {
          error:
            "gradeId and subjectId are required",
        },
        { status: 400 },
      );
    }

    const [grade, subject] =
      await Promise.all([
        prisma.grade.findFirst({
          where: {
            id: gradeId,
            schoolId: school.id,
          },
        }),
        prisma.subject.findUnique({
          where: {
            id: subjectId,
          },
        }),
      ]);

    if (!grade) {
      return NextResponse.json(
        {
          error:
            "The selected grade was not found in your school",
        },
        { status: 404 },
      );
    }

    if (!subject) {
      return NextResponse.json(
        {
          error:
            "The selected subject was not found",
        },
        { status: 404 },
      );
    }

    const gradeSubject =
      await prisma.gradeSubject.upsert({
        where: {
          gradeId_subjectId: {
            gradeId,
            subjectId,
          },
        },
        update: {},
        create: {
          gradeId,
          subjectId,
        },
        include: {
          subject: true,
        },
      });

    return NextResponse.json(
      gradeSubject,
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error assigning subject to grade:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to assign subject to grade",
      },
      { status: 500 },
    );
  }
}