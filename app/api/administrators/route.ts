import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const currentAdministrator = await getCurrentAdministrator();

    if (!currentAdministrator) {
      return NextResponse.json(
        { error: "Administrator sign-in is required" },
        { status: 401 }
      );
    }

    if (currentAdministrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          error: "Only a Platform Administrator can create administrator accounts",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const schoolId =
      typeof body.schoolId === "string" ? body.schoolId.trim() : "";
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const requestedRole =
      typeof body.role === "string" ? body.role.trim().toUpperCase() : "SCHOOL";

    if (!["SCHOOL", "BURSAR"].includes(requestedRole)) {
      return NextResponse.json(
        { error: "Role must be SCHOOL or BURSAR" },
        { status: 400 }
      );
    }

    if (!schoolId || !name || !email || !password) {
      return NextResponse.json(
        { error: "School, name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, code: true },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    const existingAdministrator = await prisma.administrator.findUnique({
      where: { email },
    });

    if (existingAdministrator) {
      return NextResponse.json(
        { error: "An administrator with this email already exists" },
        { status: 409 }
      );
    }

    const createdAdministrator = await prisma.administrator.create({
      data: {
        name,
        email,
        password: hashPassword(password),
        phone: phone || null,
        role: requestedRole,
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

    const roleLabel =
      requestedRole === "BURSAR" ? "Bursar" : "School Administrator";

    return NextResponse.json(
      {
        message: `${roleLabel} created successfully`,
        administrator: createdAdministrator,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating administrator:", error);

    return NextResponse.json(
      { error: "Failed to create administrator" },
      { status: 500 }
    );
  }
}
