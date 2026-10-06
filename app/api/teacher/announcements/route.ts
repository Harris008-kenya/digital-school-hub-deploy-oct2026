import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teacher = await getCurrentTeacher();

    if (!teacher) {
      return NextResponse.json(
        {
          error: "Teacher sign-in is required",
        },
        { status: 401 }
      );
    }

    if (!teacher.schoolId) {
      return NextResponse.json(
        {
          error:
            "Your teacher account is not assigned to a school",
        },
        { status: 403 }
      );
    }

    const announcements =
      await prisma.announcement.findMany({
        where: {
          schoolId: teacher.schoolId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          grade: {
            select: {
              id: true,
              name: true,
            },
          },
          student: {
            include: {
              grade: true,
            },
          },
          administrator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error(
      "Error loading teacher announcements:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load announcements",
      },
      { status: 500 }
    );
  }
}