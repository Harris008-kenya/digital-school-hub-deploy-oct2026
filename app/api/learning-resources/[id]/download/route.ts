import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getCurrentStudent } from "@/lib/student-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const administrator = await getCurrentAdministrator();

    if (administrator && administrator.role !== "PLATFORM") {
      return NextResponse.json(
        { error: "School Administrators cannot access Learning Resources." },
        { status: 403 }
      );
    }

    if (!administrator) {
      const teacher = await getCurrentTeacher();
      const student = teacher ? null : await getCurrentStudent();

      if (!teacher && !student) {
        return NextResponse.json(
          { error: "Sign-in is required to download learning resources." },
          { status: 401 }
        );
      }
    }

    const { id } = await context.params;
    const resource = await prisma.learningResource.findUnique({
      where: { id },
      select: {
        id: true,
        published: true,
        filePath: true,
        fileName: true,
        mimeType: true,
      },
    });

    if (!resource || (!resource.published && administrator?.role !== "PLATFORM")) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    if (!resource.filePath || !resource.fileName || !resource.mimeType) {
      return NextResponse.json(
        { error: "This resource has no downloadable file." },
        { status: 404 }
      );
    }

    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Supabase Storage server configuration is missing.");
    }

    const fileResponse = await fetch(
      `${url}/storage/v1/object/authenticated/learning-resources/${resource.filePath}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      }
    );

    if (!fileResponse.ok) {
      console.error("Supabase download failed with status:", fileResponse.status);
      return NextResponse.json({ error: "The file could not be retrieved." }, { status: 502 });
    }

    const bytes = await fileResponse.arrayBuffer();
    const safeName = resource.fileName.replace(/[\r\n"]/g, "_");

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": resource.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Learning resource download failed:", error);
    return NextResponse.json(
      { error: "Failed to download learning resource." },
      { status: 500 }
    );
  }
}