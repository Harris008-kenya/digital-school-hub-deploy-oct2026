import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CleanedOption = {
  text: string;
  isCorrect: boolean;
  position: number;
};

function validateQuestionInput(body: unknown) {
  const data =
    typeof body === "object" && body !== null
      ? (body as {
          question?: unknown;
          options?: unknown;
        })
      : {};

  const question =
    typeof data.question === "string"
      ? data.question.trim()
      : "";

  const options = Array.isArray(data.options)
    ? data.options
    : [];

  if (!question) {
    return {
      error: "Question text is required",
    };
  }

  if (options.length !== 4) {
    return {
      error:
        "A multiple-choice question must have exactly 4 options",
    };
  }

  const cleanedOptions: CleanedOption[] = options.map(
    (option: unknown, index: number) => {
      const item =
        typeof option === "object" &&
        option !== null
          ? (option as {
              text?: unknown;
              isCorrect?: unknown;
            })
          : {};

      return {
        text:
          typeof item.text === "string"
            ? item.text.trim()
            : "",
        isCorrect: item.isCorrect === true,
        position: index,
      };
    }
  );

  const emptyOption = cleanedOptions.find(
    (option: CleanedOption) => !option.text
  );

  if (emptyOption) {
    return {
      error: "All 4 answer options are required",
    };
  }

  const correctOptions = cleanedOptions.filter(
    (option: CleanedOption) => option.isCorrect
  );

  if (correctOptions.length !== 1) {
    return {
      error:
        "You must select exactly one correct answer",
    };
  }

  const duplicateTexts = new Set<string>();

  for (const option of cleanedOptions) {
    const normalizedText = option.text.toLowerCase();

    if (duplicateTexts.has(normalizedText)) {
      return {
        error:
          "Answer options must be different from each other",
      };
    }

    duplicateTexts.add(normalizedText);
  }

  return {
    question,
    cleanedOptions,
  };
}

export async function GET(
  _request: Request,
  { params }: RouteContext
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

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id,
        teacherId: teacher.id,
        teacher: {
          schoolId: teacher.schoolId,
        },
        grade: {
          schoolId: teacher.schoolId,
        },
      },
      include: {
        questions: {
          include: {
            options: {
              orderBy: {
                position: "asc",
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      questions: quiz.questions,
    });
  } catch (error) {
    console.error("Error loading quiz questions:", error);

    return NextResponse.json(
      { error: "Failed to load quiz questions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
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

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id,
        teacherId: teacher.id,
        teacher: {
          schoolId: teacher.schoolId,
        },
        grade: {
          schoolId: teacher.schoolId,
        },
      },
      include: {
        questions: {
          select: {
            position: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz.published) {
      return NextResponse.json(
        {
          error:
            "Published quizzes cannot be changed. Unpublish the quiz before adding questions.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = validateQuestionInput(body);

    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const nextPosition =
      quiz.questions.length === 0
        ? 0
        : Math.max(
            ...quiz.questions.map(
              (item) => item.position
            )
          ) + 1;

    const createdQuestion =
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          question: validation.question,
          type: "MULTIPLE_CHOICE",
          position: nextPosition,
          options: {
            create: validation.cleanedOptions,
          },
        },
        include: {
          options: {
            orderBy: {
              position: "asc",
            },
          },
        },
      });

    return NextResponse.json(
      {
        question: createdQuestion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating quiz question:", error);

    return NextResponse.json(
      { error: "Failed to create quiz question" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
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

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id,
        teacherId: teacher.id,
        teacher: {
          schoolId: teacher.schoolId,
        },
        grade: {
          schoolId: teacher.schoolId,
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz.published) {
      return NextResponse.json(
        {
          error:
            "Published quizzes cannot be changed. Unpublish the quiz before editing questions.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const questionId =
      typeof body.questionId === "string"
        ? body.questionId
        : "";

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    const existingQuestion =
      await prisma.quizQuestion.findFirst({
        where: {
          id: questionId,
          quizId: quiz.id,
        },
      });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const validation = validateQuestionInput(body);

    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.quizOption.deleteMany({
        where: {
          questionId: existingQuestion.id,
        },
      });

      await tx.quizQuestion.update({
        where: {
          id: existingQuestion.id,
        },
        data: {
          question: validation.question,
          options: {
            create: validation.cleanedOptions,
          },
        },
      });
    });

    const updatedQuestion =
      await prisma.quizQuestion.findUnique({
        where: {
          id: existingQuestion.id,
        },
        include: {
          options: {
            orderBy: {
              position: "asc",
            },
          },
        },
      });

    return NextResponse.json({
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating quiz question:", error);

    return NextResponse.json(
      { error: "Failed to update quiz question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
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

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id,
        teacherId: teacher.id,
        teacher: {
          schoolId: teacher.schoolId,
        },
        grade: {
          schoolId: teacher.schoolId,
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz.published) {
      return NextResponse.json(
        {
          error:
            "Published quizzes cannot be changed. Unpublish the quiz before deleting questions.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const questionId =
      typeof body.questionId === "string"
        ? body.questionId
        : "";

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    const existingQuestion =
      await prisma.quizQuestion.findFirst({
        where: {
          id: questionId,
          quizId: quiz.id,
        },
      });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    await prisma.quizQuestion.delete({
      where: {
        id: existingQuestion.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz question:", error);

    return NextResponse.json(
      { error: "Failed to delete quiz question" },
      { status: 500 }
    );
  }
}