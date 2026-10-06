import { NextResponse } from "next/server";
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

    const terms = await prisma.term.findMany({
      where: schoolId
        ? {
            academicYear: {
              schoolId,
            },
          }
        : undefined,
      include: {
        academicYear: {
          include: {
            school: true,
          },
        },
      },
      orderBy: [
        {
          academicYear: {
            year: "desc",
          },
        },
        {
          name: "asc",
        },
      ],
    });

    return NextResponse.json(terms);
  } catch (error) {
    console.error("Error fetching terms:", error);

    return NextResponse.json(
      { error: "Failed to fetch terms" },
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

    const academicYearId =
      typeof body.academicYearId === "string"
        ? body.academicYearId
        : "";

    const startDate =
      typeof body.startDate === "string"
        ? body.startDate
        : "";

    const endDate =
      typeof body.endDate === "string"
        ? body.endDate
        : "";

    if (!name || !academicYearId || !startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            "name, academicYearId, startDate and endDate are required",
        },
        { status: 400 }
      );
    }

    const academicYear =
      await prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          schoolId: school.id,
        },
      });

    if (!academicYear) {
      return NextResponse.json(
        {
          error:
            "Selected academic year was not found in your school",
        },
        { status: 404 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid start date or end date",
        },
        { status: 400 }
      );
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json(
        {
          error: "End date cannot be before start date",
        },
        { status: 400 }
      );
    }

    const term = await prisma.term.create({
      data: {
        name,
        academicYearId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      },
      include: {
        academicYear: true,
      },
    });

    return NextResponse.json(term, { status: 201 });
  } catch (error) {
    console.error("Error creating term:", error);

    return NextResponse.json(
      { error: "Failed to create term" },
      { status: 500 }
    );
  }
}