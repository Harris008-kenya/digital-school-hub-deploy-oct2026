import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";

const RESOURCE_TYPES = [
  "NOTE",
  "REVISION",
  "EXERCISE",
  "ASSIGNMENT",
  "STUDY_GUIDE",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const gradeLevelParam = searchParams.get("gradeLevel");
    const subjectId = searchParams.get("subjectId");
    const resourceType = searchParams.get("resourceType");

    const gradeLevel = gradeLevelParam
      ? Number(gradeLevelParam)
      : undefined;

    if (
      gradeLevel !== undefined &&
      (!Number.isInteger(gradeLevel) ||
        gradeLevel < 1 ||
        gradeLevel > 9)
    ) {
      return NextResponse.json(
        { error: "gradeLevel must be between 1 and 9" },
        { status: 400 }
      );
    }

    if (
      resourceType &&
      !RESOURCE_TYPES.includes(
        resourceType as (typeof RESOURCE_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid resource type" },
        { status: 400 }
      );
    }

    const resources = await prisma.learningResource.findMany({
      where: {
        published: true,
        ...(gradeLevel !== undefined
          ? { gradeLevel }
          : {}),
        ...(subjectId
          ? { subjectId }
          : {}),
        ...(resourceType
          ? {
              resourceType:
                resourceType as (typeof RESOURCE_TYPES)[number],
            }
          : {}),
      },
      orderBy: [
        {
          gradeLevel: "asc",
        },
        {
          subject: {
            name: "asc",
          },
        },
        {
          title: "asc",
        },
      ],
      include: {
        subject: true,
      },
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error(
      "Error fetching learning resources:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch learning resources" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const administrator =
      await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        {
          error:
            "Administrator sign-in is required",
        },
        { status: 401 }
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Only Platform Administrators can manage learning resources",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const topic =
      typeof body.topic === "string"
        ? body.topic.trim()
        : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    const gradeLevel = Number(body.gradeLevel);

    const subjectId =
      typeof body.subjectId === "string"
        ? body.subjectId.trim()
        : "";

    const resourceType =
      typeof body.resourceType === "string"
        ? body.resourceType.trim()
        : "NOTE";

    const published =
      body.published === true;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(gradeLevel) ||
      gradeLevel < 1 ||
      gradeLevel > 9
    ) {
      return NextResponse.json(
        {
          error:
            "Grade level must be a whole number from 1 to 9",
        },
        { status: 400 }
      );
    }

    if (!subjectId) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (
      !RESOURCE_TYPES.includes(
        resourceType as (typeof RESOURCE_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid resource type" },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.findUnique({
      where: {
        id: subjectId,
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    const resource =
      await prisma.learningResource.create({
        data: {
          title,
          topic: topic || null,
          gradeLevel,
          subjectId,
          resourceType:
            resourceType as (typeof RESOURCE_TYPES)[number],
          content,
          published,
        },
        include: {
          subject: true,
        },
      });

    return NextResponse.json(
      resource,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creating learning resource:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create learning resource" },
      { status: 500 }
    );
  }
}