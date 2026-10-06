import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { TEACHER_SESSION_COOKIE } from "@/lib/teacher-session";
import { ADMINISTRATOR_SESSION_COOKIE } from "@/lib/administrator-session";
import { STUDENT_SESSION_COOKIE } from "@/lib/student-session";

export async function POST() {
  const cookieStore = await cookies();

  const teacherToken = cookieStore.get(
    TEACHER_SESSION_COOKIE
  )?.value;

  const administratorToken = cookieStore.get(
    ADMINISTRATOR_SESSION_COOKIE
  )?.value;

  const studentToken = cookieStore.get(
    STUDENT_SESSION_COOKIE
  )?.value;

  if (teacherToken) {
    await prisma.teacherSession.deleteMany({
      where: {
        token: teacherToken,
      },
    });
  }

  if (administratorToken) {
    await prisma.administratorSession.deleteMany({
      where: {
        token: administratorToken,
      },
    });
  }

  if (studentToken) {
    await prisma.studentSession.deleteMany({
      where: {
        token: studentToken,
      },
    });
  }

  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set(
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

  response.cookies.set(
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

  response.cookies.set(
    STUDENT_SESSION_COOKIE,
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

  return response;
}