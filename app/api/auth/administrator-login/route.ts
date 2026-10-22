
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hasSchoolAccess } from "@/lib/school-activation";
import { ADMINISTRATOR_SESSION_COOKIE } from "@/lib/administrator-session";
import {
  checkLoginRateLimit,
  clearFailedLogins,
  getClientIp,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    let body: { email?: unknown; password?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Please provide a valid request body." },
        { status: 400 },
      );
    }

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const ipAddress = getClientIp(request);

    const rateLimit = await checkLoginRateLimit(
      "ADMINISTRATOR",
      email,
      ipAddress,
    );

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error:
            "Too many failed login attempts. Please try again later.",
        },
        { status: 429 },
      );

      response.headers.set(
        "Retry-After",
        String(rateLimit.retryAfterSeconds),
      );

      return response;
    }

    const administrator = await prisma.administrator.findUnique({
      where: { email },
    });

    if (
      !administrator ||
      !verifyPassword(password, administrator.password)
    ) {
      const failed = await recordFailedLogin(
        "ADMINISTRATOR",
        email,
        ipAddress,
      );

      if (failed.blocked) {
        const response = NextResponse.json(
          {
            error:
              "Too many failed login attempts. Please try again later.",
          },
          { status: 429 },
        );

        response.headers.set(
          "Retry-After",
          String(failed.retryAfterSeconds),
        );

        return response;
      }

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // PLATFORM administrators must retain access to manage
    // schools, including inactive or expired schools.
    if (administrator.role === "SCHOOL") {
      if (!administrator.schoolId) {
        return NextResponse.json(
          {
            error:
              "Your administrator account is not assigned to a school. Contact the Platform Administrator.",
          },
          { status: 403 },
        );
      }

      const school = await prisma.school.findUnique({
        where: {
          id: administrator.schoolId,
        },
        select: {
          id: true,
          isActive: true,
          activationExpiryDate: true,
        },
      });

      if (!school || !hasSchoolAccess(school)) {
        return NextResponse.json(
          {
            error:
              "Your school is inactive or its activation has expired. Contact the Platform Administrator.",
          },
          { status: 403 },
        );
      }
    }

    await clearFailedLogins(
      "ADMINISTRATOR",
      email,
      ipAddress,
    );

    const token = randomBytes(32).toString("hex");

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS,
    );

    await prisma.$transaction([
      prisma.administratorSession.deleteMany({
        where: {
          administratorId: administrator.id,
        },
      }),

      prisma.administratorSession.create({
        data: {
          token,
          administratorId: administrator.id,
          expiresAt,
        },
      }),
    ]);

    const response = NextResponse.json({
      administrator: {
        id: administrator.id,
        name: administrator.name,
        email: administrator.email,
        role: administrator.role,
        schoolId: administrator.schoolId,
      },
    });

    response.cookies.set(
      ADMINISTRATOR_SESSION_COOKIE,
      token,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      },
    );

    return response;
  } catch (error) {
    console.error("Error signing in administrator:", error);

    return NextResponse.json(
      { error: "Could not sign in" },
      { status: 500 },
    );
  }
}
