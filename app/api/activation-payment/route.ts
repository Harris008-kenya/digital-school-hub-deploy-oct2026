import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";

const PAYMENT_PHONE_NUMBER = "0718528131";
const MIN_TRANSACTION_CODE_LENGTH = 6;

function isPrismaErrorCode(
  error: unknown,
  code: string,
): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function POST(request: Request) {
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

    if (administrator.role !== "SCHOOL") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only school administrators can submit activation payments.",
        },
        { status: 403 },
      );
    }

    if (!administrator.schoolId) {
      return NextResponse.json(
        {
          success: false,
          message: "No school is associated with this administrator.",
        },
        { status: 400 },
      );
    }

    let body: { transactionCode?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid payment request.",
        },
        { status: 400 },
      );
    }

    const transactionCode =
      typeof body.transactionCode === "string"
        ? body.transactionCode.trim().toUpperCase()
        : "";

    if (!transactionCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter the M-PESA transaction code.",
        },
        { status: 400 },
      );
    }

    if (transactionCode.length < MIN_TRANSACTION_CODE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid M-PESA transaction code.",
        },
        { status: 400 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: administrator.schoolId },
      select: {
        id: true,
        name: true,
        activationFee: true,
      },
    });

    if (!school) {
      return NextResponse.json(
        { success: false, message: "School not found." },
        { status: 404 },
      );
    }

    const existingPayment = await prisma.activationPayment.findUnique({
      where: { transactionCode },
      select: { id: true },
    });

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This M-PESA transaction code has already been submitted.",
        },
        { status: 409 },
      );
    }

    const pendingPayment = await prisma.activationPayment.findFirst({
      where: {
        schoolId: school.id,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (pendingPayment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your school already has a payment awaiting verification. Please wait for the administrator to review it.",
        },
        { status: 409 },
      );
    }

    const activationPayment = await prisma.activationPayment.create({
      data: {
        schoolId: school.id,
        amount: school.activationFee,
        phoneNumber: PAYMENT_PHONE_NUMBER,
        transactionCode,
        status: "PENDING",
      },
      select: {
        id: true,
        amount: true,
        phoneNumber: true,
        transactionCode: true,
        status: true,
        submittedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Payment submitted successfully. It is awaiting Platform Administrator verification. School access and expiry remain subject to the school's activation status and administrator-assigned expiry date.",
        payment: activationPayment,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This M-PESA transaction code has already been submitted.",
        },
        { status: 409 },
      );
    }

    console.error("Activation payment submission error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit activation payment.",
      },
      { status: 500 },
    );
  }
}