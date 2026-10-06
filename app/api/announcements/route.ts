import { NextResponse } from "next/server";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const access = await getActiveSchoolAdministrator();

    if (!access.administrator) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (access.administrator.role === "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Platform Administrators should use the school-specific management interface.",
        },
        { status: 403 }
      );
    }

    if (!access.school) {
      return NextResponse.json(
        { error: "Your school was not found" },
        { status: 404 }
      );
    }

    const school = access.school;
    const administrator = access.administrator;

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const targetType =
      typeof body.targetType === "string"
        ? body.targetType
        : "";

    const gradeId =
      typeof body.gradeId === "string"
        ? body.gradeId
        : "";

    const studentId =
      typeof body.studentId === "string"
        ? body.studentId
        : "";

    const parentContactIds = Array.isArray(
      body.parentContactIds
    )
      ? body.parentContactIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" &&
            id.trim().length > 0
        )
      : [];

    if (!title || !message) {
      return NextResponse.json(
        {
          error:
            "Announcement title and message are required",
        },
        { status: 400 }
      );
    }

    const allowedTargetTypes = [
      "ALL_PARENTS",
      "GRADE",
      "STUDENT",
      "SELECTED_PARENTS",
    ];

    if (!allowedTargetTypes.includes(targetType)) {
      return NextResponse.json(
        {
          error: "Invalid announcement target type",
        },
        { status: 400 }
      );
    }

    if (targetType === "GRADE" && !gradeId) {
      return NextResponse.json(
        {
          error:
            "A grade must be selected for a grade announcement",
        },
        { status: 400 }
      );
    }

    if (targetType === "STUDENT" && !studentId) {
      return NextResponse.json(
        {
          error:
            "A student must be selected for a student announcement",
        },
        { status: 400 }
      );
    }

    if (
      targetType === "SELECTED_PARENTS" &&
      parentContactIds.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one parent contact must be selected",
        },
        { status: 400 }
      );
    }

    if (targetType === "GRADE") {
      const grade = await prisma.grade.findFirst({
        where: {
          id: gradeId,
          schoolId: school.id,
        },
      });

      if (!grade) {
        return NextResponse.json(
          {
            error:
              "Selected grade was not found in your school",
          },
          { status: 404 }
        );
      }
    }

    if (targetType === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          schoolId: school.id,
        },
      });

      if (!student) {
        return NextResponse.json(
          {
            error:
              "Selected student was not found in your school",
          },
          { status: 404 }
        );
      }
    }

    let recipientIds: string[] = [];

    if (targetType === "ALL_PARENTS") {
      const parentContacts =
        await prisma.parentContact.findMany({
          where: {
            schoolId: school.id,
          },
          select: {
            id: true,
          },
        });

      recipientIds = parentContacts.map(
        (parent) => parent.id
      );
    }

    if (targetType === "GRADE") {
      const parentContacts =
        await prisma.parentContact.findMany({
          where: {
            schoolId: school.id,
            student: {
              gradeId,
            },
          },
          select: {
            id: true,
          },
        });

      recipientIds = parentContacts.map(
        (parent) => parent.id
      );
    }

    if (targetType === "STUDENT") {
      const parentContacts =
        await prisma.parentContact.findMany({
          where: {
            schoolId: school.id,
            studentId,
          },
          select: {
            id: true,
          },
        });

      recipientIds = parentContacts.map(
        (parent) => parent.id
      );
    }

    if (targetType === "SELECTED_PARENTS") {
      const parentContacts =
        await prisma.parentContact.findMany({
          where: {
            schoolId: school.id,
            id: {
              in: parentContactIds,
            },
          },
          select: {
            id: true,
          },
        });

      recipientIds = parentContacts.map(
        (parent) => parent.id
      );

      if (
        recipientIds.length !==
        new Set(parentContactIds).size
      ) {
        return NextResponse.json(
          {
            error:
              "One or more selected parent contacts do not belong to your school",
          },
          { status: 400 }
        );
      }
    }

    const announcement =
      await prisma.announcement.create({
        data: {
          schoolId: school.id,
          administratorId: administrator.id,
          title,
          message,
          targetType:
            targetType as
              | "ALL_PARENTS"
              | "GRADE"
              | "STUDENT"
              | "SELECTED_PARENTS",
          gradeId:
            targetType === "GRADE"
              ? gradeId
              : null,
          studentId:
            targetType === "STUDENT"
              ? studentId
              : null,
          recipients: {
            create: recipientIds.map(
              (parentContactId) => ({
                parentContactId,
              })
            ),
          },
        },
        include: {
          grade: true,
          student: {
            include: {
              grade: true,
            },
          },
          recipients: {
            include: {
              parentContact: {
                include: {
                  student: {
                    include: {
                      grade: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    return NextResponse.json(
      {
        ...announcement,
        recipientCount: recipientIds.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creating announcement:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create announcement",
      },
      { status: 500 }
    );
  }
}