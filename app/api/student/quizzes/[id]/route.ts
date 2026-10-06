import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!student.schoolId) {
      return NextResponse.json(
        {
          error:
            "Your student account is not assigned to a school.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id,
        published: true,
        gradeId: student.gradeId,
        grade: {
          schoolId: student.schoolId,
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,

        subject: {
          select: {
            id: true,
            name: true,
          },
        },

        grade: {
          select: {
            id: true,
            name: true,
          },
        },

        questions: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            question: true,
            type: true,
            position: true,

            options: {
              orderBy: {
                position: "asc",
              },
              select: {
                id: true,
                text: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        {
          error:
            "Quiz not found or it is not available for your grade.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      quiz,
    });
  } catch (error) {
    console.error(
      "Student quiz detail API error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load quiz." },
      { status: 500 }
    );
  }
}