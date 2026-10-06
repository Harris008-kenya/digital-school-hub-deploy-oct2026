import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        { error: "Administrator sign-in is required" },
        { status: 401 }
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Only a Platform Administrator can create School Administrators",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const schoolId =
      typeof body.schoolId === "string"
        ? body.schoolId.trim()
        : "";

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

    if (!schoolId || !name || !email || !password) {
      return NextResponse.json(
        {
          error:
            "School, name, email and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return NextResponse.json(
        {
          error: "School not found",
        },
        { status: 404 }
      );
    }

    const existingAdministrator =
      await prisma.administrator.findUnique({
        where: {
          email,
        },
      });

    if (existingAdministrator) {
      return NextResponse.json(
        {
          error:
            "An administrator with this email already exists",
        },
        { status: 409 }
      );
    }

    const administratorPassword = hashPassword(password);

    const schoolAdministrator =
      await prisma.administrator.create({
        data: {
          name,
          email,
          password: administratorPassword,
          phone: phone || null,
          role: "SCHOOL",
          schoolId: school.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          schoolId: true,
          school: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        message:
          "School Administrator created successfully",
        administrator: schoolAdministrator,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creating School Administrator:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create School Administrator",
      },
      { status: 500 }
    );
  }
}