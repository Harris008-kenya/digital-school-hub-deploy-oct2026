import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const access =
      await getActiveSchoolAdministrator();

    if (!access.administrator) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    let schoolId: string | undefined;

    if (access.administrator.role === "PLATFORM") {
      schoolId = undefined;
    } else {
      if (!access.school) {
        return NextResponse.json(
          { error: "Your school was not found" },
          { status: 404 }
        );
      }

      schoolId = access.school.id;
    }

    const teachers = await prisma.teacher.findMany({
      where: schoolId
        ? {
            schoolId,
          }
        : undefined,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,

        assignments: {
          include: {
            grade: true,
            subject: true,
          },
          orderBy: [
            {
              grade: {
                level: "asc",
              },
            },
            {
              subject: {
                name: "asc",
              },
            },
          ],
        },

        classTeacherAssignments: {
          include: {
            grade: true,
          },
          orderBy: {
            grade: {
              level: "asc",
            },
          },
        },
      },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);

    return NextResponse.json(
      { error: "Failed to fetch teachers" },
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

    if (access.administrator.role === "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Platform Administrators should use the school-specific management interface.",
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

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Name, email and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 8 characters",
        },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.create({
      data: {
        name,
        email,
        password: hashPassword(password),
        phone: phone || null,
        schoolId: school.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json(teacher, {
      status: 201,
    });
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
            "A teacher with this email already exists",
        },
        { status: 409 }
      );
    }

    console.error("Error creating teacher:", error);

    return NextResponse.json(
      {
        error: "Failed to create teacher",
      },
      { status: 500 }
    );
  }
}