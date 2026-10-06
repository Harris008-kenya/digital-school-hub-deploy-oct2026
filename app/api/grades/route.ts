import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";

export async function GET() {
  try {
    const administrator = await getCurrentAdministrator();

    if (administrator) {
      if (administrator.role === "PLATFORM") {
        const grades = await prisma.grade.findMany({
          orderBy: [
            { level: "asc" },
            { name: "asc" },
          ],
          include: {
            _count: {
              select: {
                students: true,
              },
            },
          },
        });

        return NextResponse.json(grades);
      }

      const access =
        await getActiveSchoolAdministrator();

      if (!access.administrator) {
        return NextResponse.json(
          { error: access.error },
          { status: access.status }
        );
      }

      if (!access.school) {
        return NextResponse.json(
          { error: "Your school was not found" },
          { status: 404 }
        );
      }

      const grades = await prisma.grade.findMany({
        where: {
          schoolId: access.school.id,
        },
        orderBy: [
          { level: "asc" },
          { name: "asc" },
        ],
        include: {
          _count: {
            select: {
              students: true,
            },
          },
        },
      });

      return NextResponse.json(grades);
    }

    const teacher = await getCurrentTeacher();

    if (!teacher) {
      return NextResponse.json(
        { error: "Unauthorized" },
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
          (assignment) => assignment.gradeId
        )
      ),
    ];

    const grades = await prisma.grade.findMany({
      where: {
        id: {
          in: gradeIds,
        },
        schoolId: teacher.schoolId,
      },
      orderBy: [
        { level: "asc" },
        { name: "asc" },
      ],
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    return NextResponse.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);

    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access =
      await getActiveSchoolAdministrator();

    if (!access.administrator) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (access.administrator.role !== "SCHOOL") {
      return NextResponse.json(
        {
          error:
            "Platform Administrators cannot use this school management endpoint",
        },
        { status: 403 }
      );
    }

    if (!access.school) {
      return NextResponse.json(
        { error: "Your school was not found" },
        { status: 404 }
      );
    }

    const school = access.school;

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const level = Number(body.level);

    if (
      !name ||
      !Number.isInteger(level) ||
      level < 1
    ) {
      return NextResponse.json(
        {
          error:
            "A grade name and positive whole-number level are required",
        },
        { status: 400 }
      );
    }

    const grade = await prisma.grade.create({
      data: {
        name,
        level,
        school: {
          connect: {
            id: school.id,
          },
        },
      },
    });

    return NextResponse.json(
      grade,
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A grade with that name already exists in this school",
        },
        { status: 409 }
      );
    }

    console.error(
      "Error creating grade:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create grade",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access =
      await getActiveSchoolAdministrator();

    if (!access.administrator) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (access.administrator.role !== "SCHOOL") {
      return NextResponse.json(
        {
          error:
            "Platform Administrators cannot use this school management endpoint",
        },
        { status: 403 }
      );
    }

    if (!access.school) {
      return NextResponse.json(
        { error: "Your school was not found" },
        { status: 404 }
      );
    }

    const school = access.school;

    const body = await request.json();

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const level = Number(body.level);

    if (!gradeId) {
      return NextResponse.json(
        {
          error: "Grade ID is required",
        },
        { status: 400 }
      );
    }

    if (
      !name ||
      !Number.isInteger(level) ||
      level < 1
    ) {
      return NextResponse.json(
        {
          error:
            "A grade name and positive whole-number level are required",
        },
        { status: 400 }
      );
    }

    const existingGrade = await prisma.grade.findFirst({
      where: {
        id: gradeId,
        schoolId: school.id,
      },
    });

    if (!existingGrade) {
      return NextResponse.json(
        {
          error:
            "The selected grade was not found in your school",
        },
        { status: 404 }
      );
    }

    const updatedGrade = await prisma.grade.update({
      where: {
        id: existingGrade.id,
      },
      data: {
        name,
        level,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    return NextResponse.json(updatedGrade);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A grade with that name already exists in this school",
        },
        { status: 409 }
      );
    }

    console.error(
      "Error updating grade:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update grade",
      },
      { status: 500 }
    );
  }
}