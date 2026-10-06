import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-session";

export async function GET() {
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

    const quizzes = await prisma.quiz.findMany({
      where: {
        published: true,
        gradeId: student.gradeId,
        grade: {
          schoolId: student.schoolId,
        },
      },
      orderBy: {
        createdAt: "desc",
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

    return NextResponse.json({
      quizzes,
    });
  } catch (error) {
    console.error(
      "Student quizzes API error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load quizzes." },
      { status: 500 }
    );
  }
}