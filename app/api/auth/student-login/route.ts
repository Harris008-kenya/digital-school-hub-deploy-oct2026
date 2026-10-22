
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { hasSchoolAccess } from "@/lib/school-activation";
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
const SESSION_DURATION_SECONDS =
  SESSION_DURATION_DAYS * 24 * 60 * 60;

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeAdmissionNumber(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function splitStudentName(name: string) {
  const parts = name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ");

  return {
    firstName: parts[0] ?? "",
    secondName: parts[1] ?? "",
    hasExactlyTwoNames: parts.length === 2,
  };
}

async function recordFailedAttempt(
  loginIdentifier: string,
  ipAddress: string,
) {
  const failed = await recordFailedLogin(
    "STUDENT",
    loginIdentifier,
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
    { error: "Invalid student login details." },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  try {
    let body: {
      schoolId?: unknown;
      firstName?: unknown;
      secondName?: unknown;
      admissionNumber?: unknown;
      password?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Please provide a valid request body." },
        { status: 400 },
      );
    }

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
        { status: 400 },
      );
    }

    const ipAddress = getClientIp(request);

    const normalizedFirstName = normalizeName(firstName);
    const normalizedSecondName = normalizeName(secondName);
    const normalizedAdmission =
      normalizeAdmissionNumber(admissionNumber);

    const loginIdentifier =
      `${schoolId}:${normalizedFirstName}:${normalizedSecondName}:${normalizedAdmission}`;

    const rateLimit = await checkLoginRateLimit(
      "STUDENT",
      loginIdentifier,
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

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        isActive: true,
        activationExpiryDate: true,
      },
    });

    if (!school) {
      return recordFailedAttempt(loginIdentifier, ipAddress);
    }

    const now = new Date();

    if (!hasSchoolAccess(school, now)) {
      return NextResponse.json(
        {
          error:
            "This school is currently inactive or its activation has expired.",
        },
        { status: 403 },
      );
    }

    // Narrow the search to possible matches instead of loading
    // every student belonging to the school.
    const candidateStudents =
      await prisma.student.findMany({
        where: {
          schoolId: school.id,
          admissionNumber: {
            equals: admissionNumber,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          passwordHash: true,
          schoolId: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 2,
      });

    // Reject ambiguous records instead of authenticating the wrong student.
    if (candidateStudents.length !== 1) {
      return recordFailedAttempt(loginIdentifier, ipAddress);
    }

    const student = candidateStudents[0];
    const storedNames = splitStudentName(student.name);

    if (
      !storedNames.hasExactlyTwoNames ||
      normalizeName(storedNames.firstName) !==
        normalizedFirstName ||
      normalizeName(storedNames.secondName) !==
        normalizedSecondName
    ) {
      return recordFailedAttempt(loginIdentifier, ipAddress);
    }

    if (!student.passwordHash) {
      return recordFailedAttempt(loginIdentifier, ipAddress);
    }

    const passwordIsValid = await verifyPassword(
      password,
      student.passwordHash,
    );

    if (!passwordIsValid) {
      return recordFailedAttempt(loginIdentifier, ipAddress);
    }

    await clearFailedLogins(
      "STUDENT",
      loginIdentifier,
      ipAddress,
    );

    const token = randomBytes(32).toString("hex");

    const expiresAt = new Date(
      Date.now() +
        SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.$transaction([
      prisma.studentSession.deleteMany({
        where: { studentId: student.id },
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
    const secure = process.env.NODE_ENV === "production";

    // Clear other portal cookies before establishing this session.
    cookieStore.set(TEACHER_SESSION_COOKIE, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    cookieStore.set(ADMINISTRATOR_SESSION_COOKIE, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    cookieStore.set(STUDENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        schoolId: student.schoolId,
        schoolName: school.name,
        gradeId: student.gradeId,
        gradeName: student.grade.name,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during student login.",
      },
      { status: 500 },
    );
  }
}
