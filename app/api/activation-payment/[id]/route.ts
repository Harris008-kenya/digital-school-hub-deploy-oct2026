import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";

type ActivationPaymentRouteProps = {
  params: Promise<{ id: string }>;
};

class PaymentAlreadyProcessedError extends Error {
  constructor() {
    super("This activation payment has already been processed.");
    this.name = "PaymentAlreadyProcessedError";
  }
}

async function processPayment(
  id: string,
  action: "APPROVE" | "REJECT",
  administratorId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const verifiedAt = new Date();

      const transition = await tx.activationPayment.updateMany({
        where: {
          id,
          status: "PENDING",
        },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          verifiedAt,
          verifiedById: administratorId,
        },
      });

      if (transition.count !== 1) {
        throw new PaymentAlreadyProcessedError();
      }

      const payment = await tx.activationPayment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new Error(
          "Activation payment not found during verification.",
        );
      }

      const schoolBeforeUpdate = await tx.school.findUnique({
        where: { id: payment.schoolId },
        select: {
          id: true,
          name: true,
          isActive: true,
          activatedAt: true,
          activationExpiryDate: true,
        },
      });

      if (!schoolBeforeUpdate) {
        throw new Error(
          "School not found during payment verification.",
        );
      }

      if (action === "REJECT") {
        return {
          payment,
          school: schoolBeforeUpdate,
        };
      }

      // Approval activates the school but intentionally does not
      // change activationExpiryDate. Only the Platform Administrator
      // can assign or extend that date through the expiry endpoint.
      const school = await tx.school.update({
        where: { id: payment.schoolId },
        data: {
          isActive: true,
          activatedAt: schoolBeforeUpdate.activatedAt ?? verifiedAt,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          activatedAt: true,
          activationExpiryDate: true,
        },
      });

      return {
        payment,
        school,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function PATCH(
  request: Request,
  { params }: ActivationPaymentRouteProps,
) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        {
          success: false,
          message: "Administrator authentication required.",
        },
        { status: 401 },
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          success: false,
          message: "Platform Administrator access required.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Activation payment ID is required.",
        },
        { status: 400 },
      );
    }

    let body: { action?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid request body.",
        },
        { status: 400 },
      );
    }

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
        { status: 400 },
      );
    }

    const existingPayment = await prisma.activationPayment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingPayment) {
      return NextResponse.json(
        {
          success: false,
          message: "Activation payment not found.",
        },
        { status: 404 },
      );
    }

    let result:
      | Awaited<ReturnType<typeof processPayment>>
      | undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await processPayment(
          id,
          action,
          administrator.id,
        );
        break;
      } catch (error: unknown) {
        if (error instanceof PaymentAlreadyProcessedError) {
          return NextResponse.json(
            { success: false, message: error.message },
            { status: 409 },
          );
        }

        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";

        if (!isSerializationConflict || attempt === 2) {
          throw error;
        }
      }
    }

    if (!result) {
      throw new Error(
        "Payment verification could not be completed.",
      );
    }

    let message: string;

    if (action === "REJECT") {
      message = "Activation payment rejected.";
    } else if (result.school.activationExpiryDate === null) {
      message =
        "Payment approved and school activated. No expiry date is assigned, so school access remains blocked until the Platform Administrator assigns one.";
    } else {
      message =
        "Payment approved and school activated. The existing expiry date was preserved; only the Platform Administrator can change it.";
    }

    return NextResponse.json({
      success: true,
      message,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        transactionCode: result.payment.transactionCode,
        verifiedAt: result.payment.verifiedAt,
      },
      school: result.school,
    });
  } catch (error: unknown) {
    console.error(
      "Activation payment verification error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process activation payment. Please try again.",
      },
      { status: 500 },
    );
  }
}