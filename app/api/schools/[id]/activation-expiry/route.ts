import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        {
          error: "Administrator sign-in is required.",
        },
        { status: 401 }
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          error:
            "Only the Platform Administrator can change the activation expiry date.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const expiryDate =
      typeof body.expiryDate === "string"
        ? body.expiryDate.trim()
        : "";

    const school = await prisma.school.findUnique({
      where: {
        id,
      },
    });

    if (!school) {
      return NextResponse.json(
        {
          error: "School not found.",
        },
        { status: 404 }
      );
    }

    // An empty value clears the expiry date.
    if (!expiryDate) {
      const updatedSchool = await prisma.school.update({
        where: {
          id,
        },
        data: {
          activationExpiryDate: null,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          activationExpiryDate: true,
        },
      });

      return NextResponse.json({
        message: "Activation expiry date cleared successfully.",
        school: updatedSchool,
      });
    }

    const parsedExpiryDate = new Date(`${expiryDate}T23:59:59`);

    if (Number.isNaN(parsedExpiryDate.getTime())) {
      return NextResponse.json(
        {
          error: "Please provide a valid expiry date.",
        },
        { status: 400 }
      );
    }

    const updatedSchool = await prisma.school.update({
      where: {
        id,
      },
      data: {
        activationExpiryDate: parsedExpiryDate,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        activationExpiryDate: true,
      },
    });

    return NextResponse.json({
      message: "Activation expiry date updated successfully.",
      school: updatedSchool,
    });
  } catch (error) {
    console.error(
      "Error updating activation expiry date:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update activation expiry date.",
      },
      { status: 500 }
    );
  }
}