import { NextResponse } from "next/server";
import { getCurrentParent } from "@/lib/parent-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const parent = await getCurrentParent();

    if (!parent) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const parentContactIds = parent.contacts.map(
      (link) => link.parentContact.id
    );

    if (parentContactIds.length === 0) {
      return NextResponse.json({
        announcements: [],
      });
    }

    const recipients =
      await prisma.announcementRecipient.findMany({
        where: {
          parentContactId: {
            in: parentContactIds,
          },
          announcement: {
            schoolId: parent.schoolId,
          },
        },
        include: {
          announcement: {
            include: {
              administrator: {
                select: {
                  name: true,
                },
              },
              grade: {
                select: {
                  name: true,
                },
              },
              student: {
                select: {
                  name: true,
                },
              },
            },
          },
          parentContact: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const announcements = recipients.map((recipient) => ({
      id: recipient.announcement.id,
      title: recipient.announcement.title,
      message: recipient.announcement.message,
      targetType: recipient.announcement.targetType,
      grade: recipient.announcement.grade?.name ?? null,
      student: recipient.announcement.student?.name ?? null,
      createdAt: recipient.announcement.createdAt,
      readAt: recipient.readAt,
      child: {
        parentContactId: recipient.parentContact.id,
        studentId: recipient.parentContact.student.id,
        studentName: recipient.parentContact.student.name,
      },
      postedBy: recipient.announcement.administrator.name,
    }));

    return NextResponse.json({
      announcements,
    });
  } catch (error) {
    console.error("Parent announcements error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading announcements.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const parent = await getCurrentParent();

    if (!parent) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const announcementId =
      typeof body.announcementId === "string"
        ? body.announcementId.trim()
        : "";

    if (!announcementId) {
      return NextResponse.json(
        {
          error: "Announcement ID is required.",
        },
        { status: 400 }
      );
    }

    const parentContactIds = parent.contacts.map(
      (link) => link.parentContact.id
    );

    if (parentContactIds.length === 0) {
      return NextResponse.json(
        {
          error: "No parent contacts are linked to this account.",
        },
        { status: 404 }
      );
    }

    const recipient =
      await prisma.announcementRecipient.findFirst({
        where: {
          announcementId,
          parentContactId: {
            in: parentContactIds,
          },
          announcement: {
            schoolId: parent.schoolId,
          },
        },
      });

    if (!recipient) {
      return NextResponse.json(
        {
          error: "Announcement not found.",
        },
        { status: 404 }
      );
    }

    const updatedRecipient =
      await prisma.announcementRecipient.update({
        where: {
          id: recipient.id,
        },
        data: {
          readAt: recipient.readAt ?? new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message: "Announcement marked as read.",
      readAt: updatedRecipient.readAt,
    });
  } catch (error) {
    console.error("Mark announcement as read error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while marking the announcement as read.",
      },
      { status: 500 }
    );
  }
}