import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";

type ActivationPaymentRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: ActivationPaymentRouteProps
) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        {
          success: false,
          message: "Administrator authentication required.",
        },
        { status: 401 }
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          success: false,
          message: "Platform Administrator access required.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Activation payment ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        {
          success: false,
          message: "Action must be APPROVE or REJECT.",
        },
        { status: 400 }
      );
    }

    const activationPayment =
      await prisma.activationPayment.findUnique({
        where: {
          id,
        },
        include: {
          school: true,
        },
      });

    if (!activationPayment) {
      return NextResponse.json(
        {
          success: false,
          message: "Activation payment not found.",
        },
        { status: 404 }
      );
    }

    if (activationPayment.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This activation payment has already been processed.",
        },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      const activatedAt = new Date();

      const activationExpiryDate = new Date(activatedAt);
      activationExpiryDate.setMonth(
        activationExpiryDate.getMonth() + 3
      );

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.activationPayment.update({
          where: {
            id: activationPayment.id,
          },
          data: {
            status: "APPROVED",
            verifiedAt: activatedAt,
            verifiedById: administrator.id,
          },
        });

        const school = await tx.school.update({
          where: {
            id: activationPayment.schoolId,
          },
          data: {
            isActive: true,
            activatedAt,
            activationExpiryDate,
          },
        });

        return {
          payment,
          school,
        };
      });

      return NextResponse.json({
        success: true,
        message:
          "Activation payment approved and school activated successfully.",
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          transactionCode: result.payment.transactionCode,
          verifiedAt: result.payment.verifiedAt,
        },
        school: {
          id: result.school.id,
          name: result.school.name,
          isActive: result.school.isActive,
          activatedAt: result.school.activatedAt,
          activationExpiryDate:
            result.school.activationExpiryDate,
        },
      });
    }

    const payment = await prisma.activationPayment.update({
      where: {
        id: activationPayment.id,
      },
      data: {
        status: "REJECTED",
        verifiedAt: new Date(),
        verifiedById: administrator.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Activation payment rejected.",
      payment: {
        id: payment.id,
        status: payment.status,
        transactionCode: payment.transactionCode,
        verifiedAt: payment.verifiedAt,
      },
      school: {
        id: activationPayment.school.id,
        name: activationPayment.school.name,
        isActive: activationPayment.school.isActive,
        activationExpiryDate:
          activationPayment.school.activationExpiryDate,
      },
    });
  } catch (error) {
    console.error("Activation payment verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process activation payment.",
      },
      { status: 500 }
    );
  }
}