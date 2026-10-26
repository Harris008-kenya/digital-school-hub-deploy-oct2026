import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getCurrentStudent } from "@/lib/student-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RESOURCE_TYPES = [
  "NOTE",
  "REVISION",
  "EXERCISE",
  "ASSIGNMENT",
  "STUDY_GUIDE",
] as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_FILES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase Storage server configuration is missing.");
  }

  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  };
}

async function requirePlatformAdministrator() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    return {
      administrator: null,
      response: NextResponse.json(
        { error: "Administrator sign-in is required." },
        { status: 401 }
      ),
    };
  }

  if (administrator.role !== "PLATFORM") {
    return {
      administrator: null,
      response: NextResponse.json(
        { error: "Only Platform Administrators can manage learning resources." },
        { status: 403 }
      ),
    };
  }

  return { administrator, response: null };
}

function validateMetadata(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const gradeLevel = Number(body.gradeLevel);
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const resourceType =
    typeof body.resourceType === "string" ? body.resourceType.trim() : "NOTE";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const published = body.published === true;

  if (!title || title.length > 200) {
    return { error: "Title is required and must not exceed 200 characters." };
  }
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 9) {
    return { error: "Grade level must be a whole number from 1 to 9." };
  }
  if (!subjectId) {
    return { error: "Subject is required." };
  }
  if (!RESOURCE_TYPES.includes(resourceType as (typeof RESOURCE_TYPES)[number])) {
    return { error: "Invalid resource type." };
  }

  return {
    value: {
      title,
      topic: topic || null,
      gradeLevel,
      subjectId,
      resourceType: resourceType as (typeof RESOURCE_TYPES)[number],
      content,
      published,
    },
  };
}

async function uploadFile(file: File) {
  const config = storageConfig();
  const originalName = file.name.replace(/\\/g, "/").split("/").pop() || "document";
  const dot = originalName.lastIndexOf(".");
  const extension = dot >= 0 ? originalName.slice(dot).toLowerCase() : "";
  const mimeType = ALLOWED_FILES[extension];

  if (!mimeType) {
    throw new Error("Unsupported file type. Upload a PDF, DOC, DOCX, or TXT file.");
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("File must be larger than 0 bytes and no bigger than 20 MB.");
  }

  const filePath = `${randomUUID()}${extension}`;
  const bytes = await file.arrayBuffer();

  const response = await fetch(
    `${config.url}/storage/v1/object/learning-resources/${filePath}`,
    {
      method: "POST",
      headers: {
        ...config.headers,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: bytes,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Supabase upload failed with status:", response.status);
    throw new Error("The file could not be uploaded to secure storage.");
  }

  return {
    filePath,
    fileName: originalName.slice(0, 255),
    mimeType,
    fileSize: file.size,
  };
}

export async function GET(request: Request) {
  try {
    const administrator = await getCurrentAdministrator();
    let canSeeDrafts = false;

    if (administrator) {
      if (administrator.role !== "PLATFORM") {
        return NextResponse.json(
          { error: "School Administrators cannot access Learning Resources." },
          { status: 403 }
        );
      }
      canSeeDrafts = true;
    } else {
      const teacher = await getCurrentTeacher();
      const student = teacher ? null : await getCurrentStudent();

      if (!teacher && !student) {
        return NextResponse.json(
          { error: "Sign-in is required to access Learning Resources." },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const gradeParam = searchParams.get("gradeLevel");
    const subjectId = searchParams.get("subjectId");
    const typeParam = searchParams.get("resourceType");
    const gradeLevel = gradeParam ? Number(gradeParam) : undefined;

    if (
      gradeLevel !== undefined &&
      (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 9)
    ) {
      return NextResponse.json(
        { error: "gradeLevel must be between 1 and 9." },
        { status: 400 }
      );
    }

    if (
      typeParam &&
      !RESOURCE_TYPES.includes(typeParam as (typeof RESOURCE_TYPES)[number])
    ) {
      return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
    }

    const resources = await prisma.learningResource.findMany({
      where: {
        ...(canSeeDrafts ? {} : { published: true }),
        ...(gradeLevel !== undefined ? { gradeLevel } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(typeParam
          ? { resourceType: typeParam as (typeof RESOURCE_TYPES)[number] }
          : {}),
      },
      orderBy: [
        { gradeLevel: "asc" },
        { subject: { name: "asc" } },
        { title: "asc" },
      ],
      include: { subject: true },
    });

    return NextResponse.json(resources, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error fetching learning resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch learning resources." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const auth = await requirePlatformAdministrator();
    if (auth.response) return auth.response;

    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, unknown>;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      body = {
        title: form.get("title"),
        topic: form.get("topic"),
        gradeLevel: form.get("gradeLevel"),
        subjectId: form.get("subjectId"),
        resourceType: form.get("resourceType"),
        content: form.get("content"),
        published: form.get("published") === "true",
      };
      const candidate = form.get("file");
      if (candidate instanceof File && candidate.size > 0) file = candidate;
    } else {
      body = await request.json();
    }

    const validated = validateMetadata(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    if (!file && !validated.value.content) {
      return NextResponse.json(
        { error: "Enter text content or select a document to upload." },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.findUnique({
      where: { id: validated.value.subjectId },
      select: { id: true },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    const fileMetadata = file ? await uploadFile(file) : null;
    uploadedPath = fileMetadata?.filePath ?? null;

    const resource = await prisma.learningResource.create({
      data: {
        ...validated.value,
        ...(fileMetadata ?? {}),
      },
      include: { subject: true },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      try {
        const config = storageConfig();
        await fetch(`${config.url}/storage/v1/object/learning-resources`, {
          method: "DELETE",
          headers: {
            ...config.headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefixes: [uploadedPath] }),
        });
      } catch {
        console.error("Could not clean up an uploaded file after a failed resource creation.");
      }
    }

    if (error instanceof Error && (
      error.message.startsWith("Unsupported file type") ||
      error.message.startsWith("File must be") ||
      error.message.startsWith("Supabase Storage")
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error creating learning resource:", error);
    return NextResponse.json(
      { error: "Failed to create learning resource." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePlatformAdministrator();
    if (auth.response) return auth.response;

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required." }, { status: 400 });
    }

    const existing = await prisma.learningResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    if (typeof body.published === "boolean" &&
        Object.keys(body).every((key) => ["id", "published"].includes(key))) {
      const resource = await prisma.learningResource.update({
        where: { id },
        data: { published: body.published },
        include: { subject: true },
      });
      return NextResponse.json(resource);
    }

    const validated = validateMetadata(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: validated.value.subjectId },
      select: { id: true },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    const resource = await prisma.learningResource.update({
      where: { id },
      data: validated.value,
      include: { subject: true },
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Error updating learning resource:", error);
    return NextResponse.json(
      { error: "Failed to update learning resource." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePlatformAdministrator();
    if (auth.response) return auth.response;

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required." }, { status: 400 });
    }

    const existing = await prisma.learningResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    if (existing.filePath) {
      const config = storageConfig();
      const storageResponse = await fetch(
        `${config.url}/storage/v1/object/learning-resources`,
        {
          method: "DELETE",
          headers: {
            ...config.headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefixes: [existing.filePath] }),
        }
      );

      if (!storageResponse.ok) {
        console.error("Supabase file deletion failed with status:", storageResponse.status);
        return NextResponse.json(
          { error: "The stored file could not be deleted. The resource was left unchanged." },
          { status: 502 }
        );
      }
    }

    await prisma.learningResource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting learning resource:", error);
    return NextResponse.json(
      { error: "Failed to delete learning resource." },
      { status: 500 }
    );
  }
}