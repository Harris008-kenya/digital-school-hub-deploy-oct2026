import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createParentSession } from "@/lib/parent-session";
import {
  checkLoginRateLimit,
  clearFailedLogins,
  getClientIp,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const schoolId =
      typeof body.schoolId === "string"
        ? body.schoolId.trim()
        : "";

    const phoneNumber =
      typeof body.phoneNumber === "string"
        ? body.phoneNumber.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      !schoolId ||
      !phoneNumber ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "School, phone number and password are required.",
        },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);

    const rateLimit =
      await checkLoginRateLimit(
        "PARENT",
        `${schoolId}:${phoneNumber}`,
        ipAddress
      );

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error:
            "Too many failed login attempts. Please try again later.",
        },
        { status: 429 }
      );

      response.headers.set(
        "Retry-After",
        String(
          rateLimit.retryAfterSeconds
        )
      );

      return response;
    }

    const parentAccount =
      await prisma.parentAccount.findUnique({
        where: {
          schoolId_phoneNumber: {
            schoolId,
            phoneNumber,
          },
        },
        include: {
          school: true,
          contacts: {
            include: {
              parentContact: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
      });

    if (!parentAccount) {
      const failed =
        await recordFailedLogin(
          "PARENT",
          `${schoolId}:${phoneNumber}`,
          ipAddress
        );

      if (failed.blocked) {
        const response =
          NextResponse.json(
            {
              error:
                "Too many failed login attempts. Please try again later.",
            },
            { status: 429 }
          );

        response.headers.set(
          "Retry-After",
          String(
            failed.retryAfterSeconds
          )
        );

        return response;
      }

      return NextResponse.json(
        {
          error:
            "Invalid school, phone number or password.",
        },
        { status: 401 }
      );
    }

    const passwordMatches =
      await compare(
        password,
        parentAccount.password
      );

    if (!passwordMatches) {
      const failed =
        await recordFailedLogin(
          "PARENT",
          `${schoolId}:${phoneNumber}`,
          ipAddress
        );

      if (failed.blocked) {
        const response =
          NextResponse.json(
            {
              error:
                "Too many failed login attempts. Please try again later.",
            },
            { status: 429 }
          );

        response.headers.set(
          "Retry-After",
          String(
            failed.retryAfterSeconds
          )
        );

        return response;
      }

      return NextResponse.json(
        {
          error:
            "Invalid school, phone number or password.",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    const activationExpired =
      parentAccount.school.activationExpiryDate !== null &&
      parentAccount.school.activationExpiryDate < now;

    if (
      !parentAccount.school.isActive ||
      activationExpired
    ) {
      return NextResponse.json(
        {
          error:
            "Your school is currently inactive or its activation has expired. Please contact the school administrator.",
        },
        { status: 403 }
      );
    }

    await clearFailedLogins(
      "PARENT",
      `${schoolId}:${phoneNumber}`,
      ipAddress
    );

    await createParentSession(
      parentAccount.id
    );

    return NextResponse.json({
      success: true,
      message: "Parent login successful.",
      parent: {
        id: parentAccount.id,
        name: parentAccount.name,
        phoneNumber:
          parentAccount.phoneNumber,
        school: {
          id: parentAccount.school.id,
          name: parentAccount.school.name,
          code: parentAccount.school.code,
        },
        children:
          parentAccount.contacts.map(
            (link) => ({
              parentContactId:
                link.parentContact.id,
              studentId:
                link.parentContact.student.id,
              studentName:
                link.parentContact.student.name,
              relationship:
                link.parentContact.relationship,
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "Parent login error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during parent login.",
      },
      { status: 500 }
    );
  }
}