import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
    const quizzes = await prisma.quiz.findMany({
      where: {
        teacherId: teacher.id,
        grade: {
          schoolId: teacher.schoolId,
        },
        teacher: {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      quizzes,
    });
  } catch (error) {
    console.error("Error loading teacher quizzes:", error);

    return NextResponse.json(
      { error: "Failed to load quizzes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId
        : "";

    const subjectId =
      typeof body.subjectId === "string"
        ? body.subjectId
        : "";

    if (!title) {
      return NextResponse.json(
        { error: "Quiz title is required" },
        { status: 400 }
      );
    }

    if (!gradeId) {
      return NextResponse.json(
        { error: "Grade is required" },
        { status: 400 }
      );
    }

    if (!subjectId) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    const assignment = teacher.assignments.find(
      (item) =>
        item.gradeId === gradeId &&
        item.subjectId === subjectId &&
        item.grade.schoolId === teacher.schoolId
    );

    if (!assignment) {
      return NextResponse.json(
        {
          error:
            "You can only create quizzes for subjects and grades assigned to you in your school.",
        },
        { status: 403 }
      );
    }

    const grade = await prisma.grade.findFirst({
      where: {
        id: gradeId,
        schoolId: teacher.schoolId,
      },
      select: {
        id: true,
      },
    });

    if (!grade) {
      return NextResponse.json(
        { error: "The selected grade does not belong to your school." },
        { status: 403 }
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description || null,
        teacherId: teacher.id,
        gradeId: grade.id,
        subjectId,
        published: false,
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

    return NextResponse.json(
      {
        quiz,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creating teacher quiz:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const body = await request.json();

    const quizId =
      typeof body.quizId === "string"
        ? body.quizId
        : "";

    const published =
      typeof body.published === "boolean"
        ? body.published
        : null;

    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    if (published === null) {
      return NextResponse.json(
        {
          error:
            "Published status must be true or false",
        },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        teacherId: teacher.id,
        grade: {
          schoolId: teacher.schoolId,
        },
        teacher: {
          schoolId: teacher.schoolId,
        },
      },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (
      published &&
      quiz.questions.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "A quiz must have at least one question before it can be published.",
        },
        { status: 400 }
      );
    }

    const updatedQuiz =
      await prisma.quiz.update({
        where: {
          id: quiz.id,
        },
        data: {
          published,
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
    console.error(
      "Error updating teacher quiz:",
      error
    );

    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }
}