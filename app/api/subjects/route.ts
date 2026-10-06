import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const administrator = await getCurrentAdministrator();

    if (administrator) {
      if (administrator.role === "PLATFORM") {
        const subjects = await prisma.subject.findMany({
          orderBy: {
            name: "asc",
          },
        });

        return NextResponse.json(subjects);
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

      const subjects = await prisma.subject.findMany({
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json(subjects);
    }

    const teacher = await getCurrentTeacher();

    if (!teacher) {
      return NextResponse.json(
        {
          error:
            "Administrator or teacher sign-in is required",
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

    const subjectIds = [
      ...new Set(
        teacher.assignments.map(
          (assignment) => assignment.subjectId
        )
      ),
    ];

    if (subjectIds.length === 0) {
      return NextResponse.json([]);
    }

    const subjects = await prisma.subject.findMany({
      where: {
        id: {
          in: subjectIds,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error(
      "Error fetching subjects:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch subjects",
      },
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
        {
          error: access.error,
        },
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
        {
          error: "Your school was not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error: "A subject name is required",
        },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name,
      },
    });

    return NextResponse.json(
      subject,
      { status: 201 }
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "A subject with that name already exists",
        },
        { status: 409 }
      );
    }

    console.error(
      "Error creating subject:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create subject",
      },
      { status: 500 }
    );
  }
}