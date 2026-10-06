import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/student-session";
import { prisma } from "@/lib/prisma";

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

    const attempts =
      await prisma.quizAttempt.findMany({
        where: {
          studentId: student.id,
          quiz: {
            gradeId: student.gradeId,
            grade: {
              schoolId: student.schoolId,
            },
          },
        },
        orderBy: {
          completedAt: "desc",
        },
        select: {
          id: true,
          totalQuestions: true,
          answeredQuestions: true,
          correctAnswers: true,
          percentage: true,
          completedAt: true,
          quiz: {
            select: {
              id: true,
              title: true,
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
            },
          },
        },
      });

    return NextResponse.json({
      attempts,
    });
  } catch (error) {
    console.error(
      "Student quiz attempts API error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load quiz history." },
      { status: 500 }
    );
  }
}