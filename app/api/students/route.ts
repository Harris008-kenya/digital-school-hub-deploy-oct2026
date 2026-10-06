import { NextResponse } from "next/server";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { hashPassword } from "@/lib/password";
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

    const students = await prisma.student.findMany({
      where: schoolId
        ? {
            schoolId,
          }
        : undefined,
      orderBy: [
        {
          grade: {
            level: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        schoolId: true,
        gradeId: true,
        createdAt: true,
        updatedAt: true,
        grade: true,
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);

    return NextResponse.json(
      { error: "Failed to fetch students" },
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

    const schoolId = access.school.id;

    const body = await request.json();

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const secondName =
      typeof body.secondName === "string"
        ? body.secondName.trim()
        : "";

    const name = `${firstName} ${secondName}`.trim();

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId
        : "";

    const admissionNumber =
      typeof body.admissionNumber === "string"
        ? body.admissionNumber.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      !firstName ||
      !secondName ||
      !admissionNumber ||
      !gradeId ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "First name, second name, admission number, grade and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Student password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    const grade = await prisma.grade.findFirst({
      where: {
        id: gradeId,
        schoolId,
      },
    });

    if (!grade) {
      return NextResponse.json(
        {
          error:
            "Selected grade was not found in your school",
        },
        { status: 404 }
      );
    }

    const passwordHash = await hashPassword(password);

    const student = await prisma.student.create({
      data: {
        name,
        admissionNumber,
        passwordHash,
        schoolId,
        gradeId,
      },
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        schoolId: true,
        gradeId: true,
        createdAt: true,
        updatedAt: true,
        grade: true,
      },
    });

    return NextResponse.json(student, { status: 201 });
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
            "This admission number is already registered",
        },
        { status: 409 }
      );
    }

    console.error("Error registering student:", error);

    return NextResponse.json(
      { error: "Failed to register student" },
      { status: 500 }
    );
  }
}