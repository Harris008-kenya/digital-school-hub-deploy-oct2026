import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const KENYA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        { error: "Administrator sign-in is required." },
        { status: 401 },
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Only the Platform Administrator can change the expiry date.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required." },
        { status: 400 },
      );
    }

    let body: { expiryDate?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Please provide a valid request body." },
        { status: 400 },
      );
    }

    const expiryDate =
      typeof body.expiryDate === "string"
        ? body.expiryDate.trim()
        : "";

    if (!expiryDate) {
      return NextResponse.json(
        {
          error:
            "An expiry date is required. A school cannot have unlimited access.",
        },
        { status: 400 },
      );
    }

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate);

    if (!dateMatch) {
      return NextResponse.json(
        { error: "Expiry date must use YYYY-MM-DD format." },
        { status: 400 },
      );
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const calendarDate = new Date(Date.UTC(year, month - 1, day));

    const isRealDate =
      calendarDate.getUTCFullYear() === year &&
      calendarDate.getUTCMonth() === month - 1 &&
      calendarDate.getUTCDate() === day;

    if (!isRealDate) {
      return NextResponse.json(
        { error: "Please provide a real calendar date." },
        { status: 400 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found." },
        { status: 404 },
      );
    }

    // The selected date is valid through 23:59:59.999 in Kenya (UTC+3).
    const kenyaEndOfDayUtc =
      Date.UTC(year, month - 1, day, 23, 59, 59, 999) -
      KENYA_UTC_OFFSET_MS;

    const updatedSchool = await prisma.school.update({
      where: { id },
      data: {
        activationExpiryDate: new Date(kenyaEndOfDayUtc),
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        activationExpiryDate: true,
      },
    });

    return NextResponse.json({
      message:
        "Expiry date saved using Kenya time. The school's active status has not been changed.",
      school: updatedSchool,
    });
  } catch (error) {
    console.error("Error updating school expiry date:", error);

    return NextResponse.json(
      { error: "Failed to update the expiry date." },
      { status: 500 },
    );
  }
}