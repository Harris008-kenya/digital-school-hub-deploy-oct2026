import { NextResponse } from "next/server";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const access = await getActiveSchoolAdministrator();

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

    const academicYears = await prisma.academicYear.findMany({
      where: schoolId
        ? {
            schoolId,
          }
        : undefined,
      orderBy: {
        year: "desc",
      },
      include: {
        terms: true,
      },
    });

    return NextResponse.json(academicYears);
  } catch (error) {
    console.error("Error fetching academic years:", error);

    return NextResponse.json(
      { error: "Failed to fetch academic years" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getActiveSchoolAdministrator();

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

    const body = await request.json();
    const year = Number(body.year);

    if (!year) {
      return NextResponse.json(
        { error: "year is required" },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.upsert({
      where: {
        schoolId_year: {
          schoolId: access.school.id,
          year,
        },
      },
      update: {},
      create: {
        year,
        schoolId: access.school.id,
      },
      include: {
        school: true,
        terms: true,
      },
    });

    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    console.error("Error creating academic year:", error);

    return NextResponse.json(
      { error: "Failed to create academic year" },
      { status: 500 }
    );
  }
}