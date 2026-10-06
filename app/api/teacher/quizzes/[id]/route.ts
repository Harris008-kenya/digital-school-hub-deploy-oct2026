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
      { error: "Your teacher account is not assigned to a school" },
      { status: 403 }
    );
  }

  try {
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
        teacherId: teacher.id,
        teacher: {
          schoolId: teacher.schoolId,
        },
        grade: {
          schoolId: teacher.schoolId,
        },
      },
      include: {
        grade: true,
        subject: true,
        questions: {
          include: {
            options: true,
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
      quiz,
    });
  } catch (error) {
    console.error("Error loading teacher quiz:", error);

    return NextResponse.json(
      { error: "Failed to load quiz" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
      { error: "Your teacher account is not assigned to a school" },
      { status: 403 }
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : undefined;

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : undefined;

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

    const updatedQuiz = await prisma.quiz.update({
      where: {
        id: quiz.id,
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined
          ? { description: description || null }
          : {}),
      },
      include: {
        grade: true,
        subject: true,
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      quiz: updatedQuiz,
    });
  } catch (error) {
    console.error("Error updating teacher quiz:", error);

    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      { error: "Your teacher account is not assigned to a school" },
      { status: 403 }
    );
  }

  try {
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

    await prisma.quiz.delete({
      where: {
        id: quiz.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting teacher quiz:", error);

    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}