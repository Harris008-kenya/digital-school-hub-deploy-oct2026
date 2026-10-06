import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { STUDENT_SESSION_COOKIE } from "@/lib/student-session";
import {
  checkLoginRateLimit,
  clearFailedLogins,
  getClientIp,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

const TEACHER_SESSION_COOKIE = "dsh_teacher_session";
const ADMINISTRATOR_SESSION_COOKIE =
  "dsh_administrator_session";

const SESSION_DURATION_DAYS = 7;

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeAdmissionNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function splitStudentName(name: string) {
  const parts = name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ");

  return {
    firstName: parts[0] ?? "",
    secondName: parts[1] ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const schoolId =
      typeof body.schoolId === "string"
        ? body.schoolId.trim()
        : "";

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const secondName =
      typeof body.secondName === "string"
        ? body.secondName.trim()
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
      !schoolId ||
      !firstName ||
      !secondName ||
      !admissionNumber ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "School, first name, second name, admission number and password are required.",
        },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);

    const normalizedAdmission =
      normalizeAdmissionNumber(admissionNumber);

    const loginIdentifier =
      `${schoolId}:${normalizeName(firstName)}:${normalizeName(secondName)}:${normalizedAdmission}`;

    const rateLimit =
      await checkLoginRateLimit(
        "STUDENT",
        loginIdentifier,
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
        String(rateLimit.retryAfterSeconds)
      );

      return response;
    }

    const school =
      await prisma.school.findUnique({
        where: {
          id: schoolId,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          activationExpiryDate: true,
        },
      });

    if (!school) {
      const failed =
        await recordFailedLogin(
          "STUDENT",
          loginIdentifier,
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
          String(failed.retryAfterSeconds)
        );

        return response;
      }

      return NextResponse.json(
        {
          error:
            "Invalid student login details.",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    const activationExpired =
      school.activationExpiryDate !== null &&
      school.activationExpiryDate < now;

    if (!school.isActive || activationExpired) {
      return NextResponse.json(
        {
          error:
            "This school is currently inactive or its activation has expired.",
        },
        { status: 403 }
      );
    }

    const students =
      await prisma.student.findMany({
        where: {
          schoolId: school.id,
        },
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          passwordHash: true,
          schoolId: true,
          gradeId: true,
          grade: true,
        },
      });

    const normalizedFirstName =
      normalizeName(firstName);

    const normalizedSecondName =
      normalizeName(secondName);

    const matchingStudents =
      students.filter((candidate) => {
        const names =
          splitStudentName(candidate.name);

        return (
          normalizeName(names.firstName) ===
            normalizedFirstName &&
          normalizeName(names.secondName) ===
            normalizedSecondName &&
          normalizeAdmissionNumber(
            candidate.admissionNumber ?? ""
          ) === normalizedAdmission
        );
      });

    if (matchingStudents.length !== 1) {
      const failed =
        await recordFailedLogin(
          "STUDENT",
          loginIdentifier,
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
          String(failed.retryAfterSeconds)
        );

        return response;
      }

      return NextResponse.json(
        {
          error:
            "Invalid student login details.",
        },
        { status: 401 }
      );
    }

    const student =
      matchingStudents[0];

    if (!student.passwordHash) {
      const failed =
        await recordFailedLogin(
          "STUDENT",
          loginIdentifier,
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
          String(failed.retryAfterSeconds)
        );

        return response;
      }

      return NextResponse.json(
        {
          error:
            "Invalid student login details.",
        },
        { status: 401 }
      );
    }

    const passwordIsValid =
      await verifyPassword(
        password,
        student.passwordHash
      );

    if (!passwordIsValid) {
      const failed =
        await recordFailedLogin(
          "STUDENT",
          loginIdentifier,
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
          String(failed.retryAfterSeconds)
        );

        return response;
      }

      return NextResponse.json(
        {
          error:
            "Invalid student login details.",
        },
        { status: 401 }
      );
    }

    await clearFailedLogins(
      "STUDENT",
      loginIdentifier,
      ipAddress
    );

    const token =
      randomBytes(32).toString("hex");

    const expiresAt = new Date(
      Date.now() +
        SESSION_DURATION_DAYS *
          24 *
          60 *
          60 *
          1000
    );

    await prisma.$transaction([
      prisma.studentSession.deleteMany({
        where: {
          studentId: student.id,
        },
      }),

      prisma.studentSession.create({
        data: {
          token,
          studentId: student.id,
          expiresAt,
        },
      }),
    ]);

    const cookieStore = await cookies();

    cookieStore.set(
      TEACHER_SESSION_COOKIE,
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    cookieStore.set(
      ADMINISTRATOR_SESSION_COOKIE,
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    cookieStore.set(
      STUDENT_SESSION_COOKIE,
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge:
          SESSION_DURATION_DAYS *
          24 *
          60 *
          60,
      }
    );

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        admissionNumber:
          student.admissionNumber,
        schoolId: student.schoolId,
        schoolName: school.name,
        gradeId: student.gradeId,
        gradeName: student.grade.name,
      },
    });
  } catch (error) {
    console.error(
      "Student login error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete student login.",
      },
      { status: 500 }
    );
  }
}