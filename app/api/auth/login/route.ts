import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { TEACHER_SESSION_COOKIE } from "@/lib/teacher-session";
import {
  checkLoginRateLimit,
  clearFailedLogins,
  getClientIp,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();

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
        {
          error:
            "Email and password are required",
        },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);

    const rateLimit =
      await checkLoginRateLimit(
        "TEACHER",
        email,
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

    const teacher =
      await prisma.teacher.findUnique({
        where: { email },
        include: {
          school: {
            select: {
              id: true,
              isActive: true,
              activationExpiryDate: true,
            },
          },
        },
      });

    if (
      !teacher ||
      !verifyPassword(
        password,
        teacher.password
      )
    ) {
      const failed =
        await recordFailedLogin(
          "TEACHER",
          email,
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
            "Invalid email or password",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    const activationExpired =
      teacher.school.activationExpiryDate !== null &&
      teacher.school.activationExpiryDate < now;

    if (
      !teacher.school.isActive ||
      activationExpired
    ) {
      return NextResponse.json(
        {
          error:
            "This school is currently inactive or its activation has expired.",
        },
        { status: 403 }
      );
    }

    await clearFailedLogins(
      "TEACHER",
      email,
      ipAddress
    );

    const token =
      randomBytes(32).toString("hex");

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS
    );

    await prisma.$transaction([
      prisma.teacherSession.deleteMany({
        where: {
          teacherId: teacher.id,
        },
      }),

      prisma.teacherSession.create({
        data: {
          token,
          teacherId: teacher.id,
          expiresAt,
        },
      }),
    ]);

    const response =
      NextResponse.json({
        teacher: {
          id: teacher.id,
          name: teacher.name,
        },
      });

    response.cookies.set(
      TEACHER_SESSION_COOKIE,
      token,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        expires: expiresAt,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Error signing in teacher:",
      error
    );

    return NextResponse.json(
      {
        error: "Could not sign in",
      },
      { status: 500 }
    );
  }
}
