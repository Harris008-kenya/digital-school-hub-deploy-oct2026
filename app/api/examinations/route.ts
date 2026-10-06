import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";
import { requireActiveSchoolAdministrator } from "@/lib/school-access";

// GET: Fetch examinations
export async function GET() {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        { error: "Administrator sign-in is required" },
        { status: 401 }
      );
    }

    if (administrator.role === "PLATFORM") {
      const examinations = await prisma.examination.findMany({
        include: {
          term: {
            include: {
              academicYear: true,
            },
          },
          grade: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(examinations);
    }

    await requireActiveSchoolAdministrator();

    const examinations = await prisma.examination.findMany({
      where: {
        grade: {
          schoolId: administrator.schoolId!,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(examinations);
  } catch (error) {
    console.error("Error fetching examinations:", error);

    return NextResponse.json(
      { error: "Failed to fetch examinations" },
      { status: 500 }
    );
  }
}

// POST: Create an examination
export async function POST(request: Request) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        { error: "Administrator sign-in is required" },
        { status: 401 }
      );
    }

    if (administrator.role === "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Platform Administrators should use the school-specific management interface.",
        },
        { status: 403 }
      );
    }

    await requireActiveSchoolAdministrator();

    if (!administrator.schoolId) {
      return NextResponse.json(
        {
          error:
            "Your administrator account is not assigned to a school",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const termId =
      typeof body.termId === "string"
        ? body.termId
        : "";

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId
        : "";

    if (!name || !termId || !gradeId) {
      return NextResponse.json(
        {
          error: "name, termId and gradeId are required",
        },
        { status: 400 }
      );
    }

    const [term, grade] = await Promise.all([
      prisma.term.findFirst({
        where: {
          id: termId,
          academicYear: {
            schoolId: administrator.schoolId,
          },
        },
      }),
      prisma.grade.findFirst({
        where: {
          id: gradeId,
          schoolId: administrator.schoolId,
        },
      }),
    ]);

    if (!term || !grade) {
      return NextResponse.json(
        {
          error:
            "The selected term or grade was not found in your school",
        },
        { status: 404 }
      );
    }

    const examination = await prisma.examination.create({
      data: {
        name,
        termId,
        gradeId,
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

    return NextResponse.json(examination, { status: 201 });
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
            "An examination with this name already exists for the selected grade and term",
        },
        { status: 409 }
      );
    }

    console.error("Error creating examination:", error);

    return NextResponse.json(
      { error: "Failed to create examination" },
      { status: 500 }
    );
  }
}