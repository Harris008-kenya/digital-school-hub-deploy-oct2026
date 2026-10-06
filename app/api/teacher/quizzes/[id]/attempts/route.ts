import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Authentication required" },
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

  try {
    const { id: quizId } = await context.params;

    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    // Confirm that this quiz belongs to the currently
    // logged-in teacher and to the teacher's school.
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        teacherId: teacher.id,
        teacher: {
          schoolId: teacher.schoolId,
        },
        grade: {
          schoolId: teacher.schoolId,
        },
      },
      select: {
        id: true,
        title: true,
        grade: {
          select: {
            name: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found." },
        { status: 404 }
      );
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        student: {
          schoolId: teacher.schoolId,
          grade: {
            schoolId: teacher.schoolId,
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
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            grade: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      quiz,
      attempts,
    });
  } catch (error) {
    console.error(
      "Teacher quiz attempts API error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load quiz attempts." },
      { status: 500 }
    );
  }
}