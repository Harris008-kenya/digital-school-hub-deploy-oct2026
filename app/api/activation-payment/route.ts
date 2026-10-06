import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdministrator } from "@/lib/administrator-session";

const PAYMENT_PHONE_NUMBER = "0718528131";

export async function POST(request: Request) {
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

    if (administrator.role !== "SCHOOL") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only school administrators can submit activation payments.",
        },
        { status: 403 }
      );
    }

    if (!administrator.schoolId) {
      return NextResponse.json(
        {
          success: false,
          message: "No school is associated with this administrator.",
        },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: {
        id: administrator.schoolId,
      },
    });

    if (!school) {
      return NextResponse.json(
        {
          success: false,
          message: "School not found.",
        },
        { status: 404 }
      );
    }

    if (school.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "This school is already active.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

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
        { status: 400 }
      );
    }

    if (transactionCode.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid M-PESA transaction code.",
        },
        { status: 400 }
      );
    }

    const existingPayment = await prisma.activationPayment.findUnique({
      where: {
        transactionCode,
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This M-PESA transaction code has already been submitted.",
        },
        { status: 409 }
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
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Activation payment submitted successfully. Your payment is pending verification.",
        payment: {
          id: activationPayment.id,
          amount: activationPayment.amount,
          phoneNumber: activationPayment.phoneNumber,
          transactionCode: activationPayment.transactionCode,
          status: activationPayment.status,
          submittedAt: activationPayment.submittedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Activation payment submission error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit activation payment.",
      },
      { status: 500 }
    );
  }
}