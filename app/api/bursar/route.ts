import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { hasSchoolAccess } from "@/lib/school-activation";
import { prisma } from "@/lib/prisma";

async function getBursarAccess() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    return { error: "Please sign in.", status: 401 };
  }

  if (administrator.role !== "BURSAR" || !administrator.schoolId) {
    return {
      error: "Only a bursar assigned to a school can use this portal.",
      status: 403,
    };
  }

  const school = await prisma.school.findUnique({
    where: { id: administrator.schoolId },
    select: {
      id: true,
      name: true,
      isActive: true,
      activationExpiryDate: true,
    },
  });

  if (!school) {
    return { error: "Your assigned school was not found.", status: 404 };
  }

  if (!hasSchoolAccess(school)) {
    return {
      error: "Your school activation is inactive or has expired.",
      status: 403,
    };
  }

  return { administrator, school, error: null, status: 200 };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validAmount(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export async function GET() {
  try {
    const access = await getBursarAccess();

    if (!access.school || !access.administrator) {
      return jsonError(access.error || "Access denied.", access.status);
    }

    const schoolId = access.school.id;

    const [students, grades, terms, feeTypes, structures, payments] =
      await Promise.all([
        prisma.student.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            gradeId: true,
            grade: { select: { id: true, name: true, level: true } },
          },
          orderBy: [{ name: "asc" }],
        }),

        prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, name: true, level: true },
          orderBy: [{ level: "asc" }, { name: "asc" }],
        }),

        prisma.term.findMany({
          where: { academicYear: { schoolId } },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicYear: { select: { year: true } },
          },
          orderBy: [{ academicYear: { year: "desc" } }, { name: "asc" }],
        }),

        prisma.bursarFeeType.findMany({
          where: { schoolId },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        }),

        prisma.bursarFeeStructure.findMany({
          where: { schoolId },
          include: {
            grade: { select: { id: true, name: true, level: true } },
            term: {
              select: {
                id: true,
                name: true,
                academicYear: { select: { year: true } },
              },
            },
            feeType: { select: { id: true, name: true, isActive: true } },
          },
          orderBy: [{ termId: "asc" }, { gradeId: "asc" }],
        }),

        prisma.bursarStudentPayment.findMany({
          where: { schoolId },
          include: {
            student: {
              select: { id: true, name: true, admissionNumber: true },
            },
            grade: { select: { id: true, name: true, level: true } },
            term: {
              select: {
                id: true,
                name: true,
                academicYear: { select: { year: true } },
              },
            },
            feeType: { select: { id: true, name: true } },
            recordedBy: { select: { id: true, name: true } },
            corrections: {
              select: {
                id: true,
                reason: true,
                createdAt: true,
                correctedBy: { select: { name: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: [{ paidAt: "desc" }],
        }),
      ]);

    return NextResponse.json({
      school: access.school,
      students,
      grades,
      terms,
      feeTypes,
      structures,
      payments,
    });
  } catch (error) {
    console.error("Bursar GET error:", error);
    return jsonError("Could not load bursar records. Check the database migration and server logs.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const access = await getBursarAccess();

    if (!access.school || !access.administrator) {
      return jsonError(access.error || "Access denied.", access.status);
    }

    const body = await request.json();
    const action = cleanString(body.action);
    const schoolId = access.school.id;

    if (action === "fee-type") {
      const name = cleanString(body.name);
      const description = cleanString(body.description);

      if (!name) {
        return jsonError("Enter a fee type name.", 400);
      }

      const feeType = await prisma.bursarFeeType.create({
        data: {
          schoolId,
          name,
          description: description || null,
        },
      });

      return NextResponse.json(feeType, { status: 201 });
    }

    if (action === "fee-structure") {
      const gradeId = cleanString(body.gradeId);
      const termId = cleanString(body.termId);
      const feeTypeId = cleanString(body.feeTypeId);
      const amount = validAmount(body.amount);
      const reason = cleanString(body.reason);

      if (!gradeId || !termId || !feeTypeId || amount === null) {
        return jsonError("Select a grade, term and fee type, and enter an amount greater than zero.", 400);
      }

      const [grade, term, feeType] = await Promise.all([
        prisma.grade.findFirst({ where: { id: gradeId, schoolId } }),
        prisma.term.findFirst({
          where: { id: termId, academicYear: { schoolId } },
        }),
        prisma.bursarFeeType.findFirst({
          where: { id: feeTypeId, schoolId, isActive: true },
        }),
      ]);

      if (!grade || !term || !feeType) {
        return jsonError("The selected grade, term or active fee type does not belong to your school.", 400);
      }

      const existing = await prisma.bursarFeeStructure.findFirst({
        where: { schoolId, gradeId, termId, feeTypeId },
      });

      if (existing) {
        if (Number(existing.amount) === amount) {
          return jsonError("That fee structure already has this amount.", 409);
        }

        if (!reason) {
          return jsonError("Enter a reason when changing an existing fee amount.", 400);
        }

        const updated = await prisma.$transaction(async (tx) => {
          await tx.bursarFeeStructureRevision.create({
            data: {
              feeStructureId: existing.id,
              previousAmount: existing.amount,
              newAmount: amount,
              reason,
              changedById: access.administrator.id,
            },
          });

          return tx.bursarFeeStructure.update({
            where: { id: existing.id },
            data: { amount },
          });
        });

        return NextResponse.json(updated);
      }

      const created = await prisma.bursarFeeStructure.create({
        data: { schoolId, gradeId, termId, feeTypeId, amount },
      });

      return NextResponse.json(created, { status: 201 });
    }

    if (action === "payment") {
      const studentId = cleanString(body.studentId);
      const gradeId = cleanString(body.gradeId);
      const termId = cleanString(body.termId);
      const feeTypeId = cleanString(body.feeTypeId);
      const amount = validAmount(body.amount);
      const paymentMethod = (cleanString(body.paymentMethod) || "MPESA").toUpperCase();
      const mpesaReference = cleanString(body.mpesaReference).toUpperCase();
      const phoneNumber = cleanString(body.phoneNumber);
      const notes = cleanString(body.notes);
      const paidAtInput = cleanString(body.paidAt);
      const paidAt = paidAtInput ? new Date(paidAtInput) : new Date();

      const allowedPaymentMethods = ["MPESA", "CASH", "BANK", "OTHER"];
      if (!allowedPaymentMethods.includes(paymentMethod)) {
        return jsonError("Choose a supported payment method: M-PESA, Cash, Bank or Other.", 400);
      }

      if (paidAtInput && !/^\d{4}-\d{2}-\d{2}$/.test(paidAtInput)) {
        return jsonError("Enter the payment date in YYYY-MM-DD format.", 400);
      }

      if (!studentId || !gradeId || !termId || !feeTypeId || amount === null) {
        return jsonError("Select a learner, grade, term and fee type, and enter a payment amount greater than zero.", 400);
      }

      if (Number.isNaN(paidAt.getTime())) {
        return jsonError("Enter a valid payment date.", 400);
      }

      if (paidAtInput && paidAt.toISOString().slice(0, 10) !== paidAtInput) {
        return jsonError("Enter a real calendar date.", 400);
      }

      if (paymentMethod === "MPESA" && !mpesaReference) {
        return jsonError("Enter the M-PESA transaction reference.", 400);
      }

      const [student, grade, term, feeType, structure] = await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, schoolId },
        }),
        prisma.grade.findFirst({
          where: { id: gradeId, schoolId },
        }),
        prisma.term.findFirst({
          where: { id: termId, academicYear: { schoolId } },
        }),
        prisma.bursarFeeType.findFirst({
          where: { id: feeTypeId, schoolId, isActive: true },
        }),
        prisma.bursarFeeStructure.findFirst({
          where: { schoolId, gradeId, termId, feeTypeId },
        }),
      ]);

      if (!student || !grade || !term || !feeType) {
        return jsonError("One or more selected records do not belong to your school.", 400);
      }

      if (student.gradeId !== gradeId) {
        return jsonError("The selected grade does not match the learner's current grade.", 400);
      }

      if (!structure) {
        return jsonError("Set up the fee structure for this grade, term and fee type before recording payments.", 400);
      }

      const receiptNumber = `DSH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      const payment = await prisma.bursarStudentPayment.create({
        data: {
          schoolId,
          studentId,
          gradeId,
          termId,
          feeTypeId,
          amount,
          receiptNumber,
          paymentMethod,
          mpesaReference: mpesaReference || null,
          phoneNumber: phoneNumber || null,
          paidAt,
          recordedById: access.administrator.id,
          notes: notes || null,
        },
        include: {
          student: { select: { name: true, admissionNumber: true } },
          grade: { select: { name: true } },
          term: {
            select: {
              name: true,
              academicYear: { select: { year: true } },
            },
          },
          feeType: { select: { name: true } },
        },
      });

      return NextResponse.json(payment, { status: 201 });
    }

    return jsonError("Unknown bursar action.", 400);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "P2002")
    ) {
      return jsonError("That fee type, receipt or M-PESA reference already exists. Check the records and try again.", 409);
    }

    console.error("Bursar POST error:", error);
    return jsonError("Could not save the record. Check the server logs and confirm the database migration has been applied.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await getBursarAccess();

    if (!access.school || !access.administrator) {
      return jsonError(access.error || "Access denied.", access.status);
    }

    const body = await request.json();
    const paymentId = cleanString(body.paymentId);
    const reason = cleanString(body.reason);
    const amount = validAmount(body.amount);
    const notes = cleanString(body.notes);

    if (!paymentId || !reason || amount === null) {
      return jsonError("Payment ID, correction reason and a valid new amount are required.", 400);
    }

    const existing = await prisma.bursarStudentPayment.findFirst({
      where: { id: paymentId, schoolId: access.school.id },
      include: { feeType: { select: { name: true } } },
    });

    if (!existing) {
      return jsonError("Payment record not found in your school.", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.bursarPaymentCorrection.create({
        data: {
          paymentId: existing.id,
          previousStudentId: existing.studentId,
          newStudentId: existing.studentId,
          previousGradeId: existing.gradeId,
          newGradeId: existing.gradeId,
          previousTermId: existing.termId,
          newTermId: existing.termId,
          previousFeeTypeId: existing.feeTypeId,
          newFeeTypeId: existing.feeTypeId,
          previousAmount: existing.amount,
          newAmount: amount,
          previousFeeTypeName: existing.feeType.name,
          newFeeTypeName: existing.feeType.name,
          previousPaymentMethod: existing.paymentMethod,
          newPaymentMethod: existing.paymentMethod,
          previousMpesaReference: existing.mpesaReference,
          newMpesaReference: existing.mpesaReference,
          previousPhoneNumber: existing.phoneNumber,
          newPhoneNumber: existing.phoneNumber,
          previousPaidAt: existing.paidAt,
          newPaidAt: existing.paidAt,
          previousNotes: existing.notes,
          newNotes: notes || null,
          reason,
          correctedById: access.administrator.id,
        },
      });

      return tx.bursarStudentPayment.update({
        where: { id: existing.id },
        data: { amount, notes: notes || null },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Bursar PATCH error:", error);
    return jsonError("Could not correct the payment. No successful correction was confirmed.", 500);
  }
}
