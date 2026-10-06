import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/student-session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SubmittedAnswer = {
  questionId: string;
  optionId: string;
};

export async function POST(
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

    const { id: quizId } = await context.params;

    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const answers = Array.isArray(body.answers)
      ? body.answers
      : null;

    if (!answers) {
      return NextResponse.json(
        { error: "Answers are required." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        published: true,
        gradeId: student.gradeId,
        grade: {
          schoolId: student.schoolId,
        },
      },
      select: {
        id: true,
        questions: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            options: {
              select: {
                id: true,
                isCorrect: true,
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

    const validQuestionIds = new Set(
      quiz.questions.map((question) => question.id)
    );

    const submittedAnswers: SubmittedAnswer[] = [];

    for (const answer of answers) {
      if (
        !answer ||
        typeof answer.questionId !== "string" ||
        typeof answer.optionId !== "string"
      ) {
        continue;
      }

      if (!validQuestionIds.has(answer.questionId)) {
        return NextResponse.json(
          {
            error:
              "One or more submitted answers belong to an invalid question.",
          },
          { status: 400 }
        );
      }

      const question = quiz.questions.find(
        (item) => item.id === answer.questionId
      );

      if (!question) {
        return NextResponse.json(
          { error: "Invalid question." },
          { status: 400 }
        );
      }

      const optionBelongsToQuestion =
        question.options.some(
          (option) => option.id === answer.optionId
        );

      if (!optionBelongsToQuestion) {
        return NextResponse.json(
          {
            error:
              "An answer option does not belong to its question.",
          },
          { status: 400 }
        );
      }

      submittedAnswers.push({
        questionId: answer.questionId,
        optionId: answer.optionId,
      });
    }

    /*
     * Keep only one answer per question.
     * If the same question appears more than once,
     * the last submitted answer is used.
     */
    const uniqueAnswers = new Map<string, string>();

    for (const answer of submittedAnswers) {
      uniqueAnswers.set(
        answer.questionId,
        answer.optionId
      );
    }

    let correctAnswers = 0;

    for (const [questionId, optionId] of uniqueAnswers) {
      const question = quiz.questions.find(
        (item) => item.id === questionId
      );

      if (!question) {
        continue;
      }

      const selectedOption = question.options.find(
        (option) => option.id === optionId
      );

      if (selectedOption?.isCorrect) {
        correctAnswers++;
      }
    }

    const totalQuestions = quiz.questions.length;
    const answeredQuestions = uniqueAnswers.size;

    const percentage =
      totalQuestions > 0
        ? Math.round(
            (correctAnswers / totalQuestions) * 100
          )
        : 0;

    /*
     * Save the completed attempt and all submitted answers
     * in one database transaction.
     */
    const attempt = await prisma.$transaction(
      async (tx) => {
        return tx.quizAttempt.create({
          data: {
            studentId: student.id,
            quizId: quiz.id,
            totalQuestions,
            answeredQuestions,
            correctAnswers,
            percentage,
            answers: {
              create: Array.from(
                uniqueAnswers.entries()
              ).map(
                ([questionId, optionId]) => ({
                  questionId,
                  optionId,
                })
              ),
            },
          },
          select: {
            id: true,
            totalQuestions: true,
            answeredQuestions: true,
            correctAnswers: true,
            percentage: true,
            completedAt: true,
          },
        });
      }
    );

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      result: {
        totalQuestions: attempt.totalQuestions,
        answeredQuestions:
          attempt.answeredQuestions,
        correctAnswers:
          attempt.correctAnswers,
        percentage: attempt.percentage,
        completedAt: attempt.completedAt,
      },
    });
  } catch (error) {
    console.error(
      "Student quiz submission error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to submit quiz." },
      { status: 500 }
    );
  }
}