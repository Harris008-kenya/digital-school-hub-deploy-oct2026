-- AlterEnum
ALTER TYPE "AdministratorRole" ADD VALUE 'BURSAR';

-- CreateTable
CREATE TABLE "BursarFeeType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BursarFeeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BursarFeeStructure" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BursarFeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BursarFeeStructureRevision" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "previousAmount" DECIMAL(12,2) NOT NULL,
    "newAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BursarFeeStructureRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BursarStudentPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'MPESA',
    "mpesaReference" TEXT,
    "phoneNumber" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BursarStudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BursarPaymentCorrection" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "previousStudentId" TEXT NOT NULL,
    "newStudentId" TEXT NOT NULL,
    "previousGradeId" TEXT NOT NULL,
    "newGradeId" TEXT NOT NULL,
    "previousTermId" TEXT NOT NULL,
    "newTermId" TEXT NOT NULL,
    "previousFeeTypeId" TEXT NOT NULL,
    "newFeeTypeId" TEXT NOT NULL,
    "previousAmount" DECIMAL(12,2) NOT NULL,
    "newAmount" DECIMAL(12,2) NOT NULL,
    "previousFeeTypeName" TEXT NOT NULL,
    "newFeeTypeName" TEXT NOT NULL,
    "previousPaymentMethod" TEXT NOT NULL,
    "newPaymentMethod" TEXT NOT NULL,
    "previousMpesaReference" TEXT,
    "newMpesaReference" TEXT,
    "previousPhoneNumber" TEXT,
    "newPhoneNumber" TEXT,
    "previousPaidAt" TIMESTAMP(3) NOT NULL,
    "newPaidAt" TIMESTAMP(3) NOT NULL,
    "previousNotes" TEXT,
    "newNotes" TEXT,
    "reason" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BursarPaymentCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BursarFeeType_schoolId_isActive_idx" ON "BursarFeeType"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BursarFeeType_schoolId_name_key" ON "BursarFeeType"("schoolId", "name");

-- CreateIndex
CREATE INDEX "BursarFeeStructure_schoolId_termId_idx" ON "BursarFeeStructure"("schoolId", "termId");

-- CreateIndex
CREATE INDEX "BursarFeeStructure_gradeId_termId_idx" ON "BursarFeeStructure"("gradeId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "BursarFeeStructure_gradeId_termId_feeTypeId_key" ON "BursarFeeStructure"("gradeId", "termId", "feeTypeId");

-- CreateIndex
CREATE INDEX "BursarFeeStructureRevision_feeStructureId_createdAt_idx" ON "BursarFeeStructureRevision"("feeStructureId", "createdAt");

-- CreateIndex
CREATE INDEX "BursarFeeStructureRevision_changedById_idx" ON "BursarFeeStructureRevision"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "BursarStudentPayment_receiptNumber_key" ON "BursarStudentPayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BursarStudentPayment_mpesaReference_key" ON "BursarStudentPayment"("mpesaReference");

-- CreateIndex
CREATE INDEX "BursarStudentPayment_schoolId_termId_idx" ON "BursarStudentPayment"("schoolId", "termId");

-- CreateIndex
CREATE INDEX "BursarStudentPayment_gradeId_termId_feeTypeId_idx" ON "BursarStudentPayment"("gradeId", "termId", "feeTypeId");

-- CreateIndex
CREATE INDEX "BursarStudentPayment_studentId_termId_idx" ON "BursarStudentPayment"("studentId", "termId");

-- CreateIndex
CREATE INDEX "BursarStudentPayment_paidAt_idx" ON "BursarStudentPayment"("paidAt");

-- CreateIndex
CREATE INDEX "BursarPaymentCorrection_paymentId_createdAt_idx" ON "BursarPaymentCorrection"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "BursarPaymentCorrection_correctedById_idx" ON "BursarPaymentCorrection"("correctedById");

-- AddForeignKey
ALTER TABLE "BursarFeeType" ADD CONSTRAINT "BursarFeeType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarFeeStructure" ADD CONSTRAINT "BursarFeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarFeeStructure" ADD CONSTRAINT "BursarFeeStructure_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarFeeStructure" ADD CONSTRAINT "BursarFeeStructure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarFeeStructure" ADD CONSTRAINT "BursarFeeStructure_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "BursarFeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarFeeStructureRevision" ADD CONSTRAINT "BursarFeeStructureRevision_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "BursarFeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarFeeStructureRevision" ADD CONSTRAINT "BursarFeeStructureRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarStudentPayment" ADD CONSTRAINT "BursarStudentPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarStudentPayment" ADD CONSTRAINT "BursarStudentPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarStudentPayment" ADD CONSTRAINT "BursarStudentPayment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarStudentPayment" ADD CONSTRAINT "BursarStudentPayment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarStudentPayment" ADD CONSTRAINT "BursarStudentPayment_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "BursarFeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarStudentPayment" ADD CONSTRAINT "BursarStudentPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarPaymentCorrection" ADD CONSTRAINT "BursarPaymentCorrection_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BursarStudentPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BursarPaymentCorrection" ADD CONSTRAINT "BursarPaymentCorrection_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "Administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
