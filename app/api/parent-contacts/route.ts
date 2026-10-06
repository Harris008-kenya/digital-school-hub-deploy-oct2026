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

    const parentContacts =
      await prisma.parentContact.findMany({
        where: {
          schoolId: school.id,
        },
        orderBy: [
          {
            name: "asc",
          },
        ],
        include: {
          student: {
            include: {
              grade: true,
            },
          },
          accountLinks: {
            include: {
              parentAccount: {
                select: {
                  id: true,
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json(parentContacts);
  } catch (error) {
    console.error(
      "Error fetching parent contacts:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch parent contacts" },
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

    const phoneNumber =
      typeof body.phoneNumber === "string"
        ? body.phoneNumber.trim()
        : "";

    const relationship =
      typeof body.relationship === "string"
        ? body.relationship.trim()
        : "";

    const studentId =
      typeof body.studentId === "string"
        ? body.studentId
        : "";

    if (!name || !phoneNumber || !studentId) {
      return NextResponse.json(
        {
          error:
            "Parent name, phone number and student are required",
        },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: school.id,
      },
      include: {
        grade: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          error:
            "Selected student was not found in your school",
        },
        { status: 404 }
      );
    }

    const parentContact =
      await prisma.parentContact.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          name,
          phoneNumber,
          relationship: relationship || null,
        },
        include: {
          student: {
            include: {
              grade: true,
            },
          },
          accountLinks: {
            include: {
              parentAccount: {
                select: {
                  id: true,
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json(
      parentContact,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creating parent contact:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create parent contact" },
      { status: 500 }
    );
  }
}