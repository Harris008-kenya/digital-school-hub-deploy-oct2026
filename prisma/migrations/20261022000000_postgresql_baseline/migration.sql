-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdministratorRole" AS ENUM ('PLATFORM', 'SCHOOL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivationPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LearningResourceType" AS ENUM ('NOTE', 'REVISION', 'EXERCISE', 'ASSIGNMENT', 'STUDY_GUIDE');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "AnnouncementTargetType" AS ENUM ('ALL_PARENTS', 'GRADE', 'STUDENT', 'SELECTED_PARENTS');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activationFee" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "activatedAt" TIMESTAMP(3),
    "activationExpiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "AdministratorRole" NOT NULL DEFAULT 'SCHOOL',
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministratorSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "administratorId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministratorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "admissionNumber" TEXT,
    "passwordHash" TEXT,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeSubject" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "GradeSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Examination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Examination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "teacherId" TEXT,
    "marks" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "phoneNumber" TEXT,
    "transactionId" TEXT,
    "receiptNumber" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'MPESA',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "transactionCode" TEXT NOT NULL,
    "status" "ActivationPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "gradeLevel" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "resourceType" "LearningResourceType" NOT NULL DEFAULT 'NOTE',
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "QuizQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "answeredQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "percentage" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentContact" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "administratorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetType" "AnnouncementTargetType" NOT NULL DEFAULT 'ALL_PARENTS',
    "gradeId" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRecipient" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "parentContactId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentAccount" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentAccountContact" (
    "id" TEXT NOT NULL,
    "parentAccountId" TEXT NOT NULL,
    "parentContactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentAccountContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "parentAccountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "parentAccountId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "loginType" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginIpAttempt" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginIpAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_email_key" ON "Administrator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdministratorSession_token_key" ON "AdministratorSession"("token");

-- CreateIndex
CREATE INDEX "AdministratorSession_administratorId_idx" ON "AdministratorSession"("administratorId");

-- CreateIndex
CREATE INDEX "AdministratorSession_expiresAt_idx" ON "AdministratorSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSession_token_key" ON "TeacherSession"("token");

-- CreateIndex
CREATE INDEX "TeacherSession_teacherId_idx" ON "TeacherSession"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSession_expiresAt_idx" ON "TeacherSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "Student_gradeId_idx" ON "Student"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSession_token_key" ON "StudentSession"("token");

-- CreateIndex
CREATE INDEX "StudentSession_studentId_idx" ON "StudentSession"("studentId");

-- CreateIndex
CREATE INDEX "StudentSession_expiresAt_idx" ON "StudentSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Grade_schoolId_idx" ON "Grade"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_schoolId_name_key" ON "Grade"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GradeSubject_gradeId_subjectId_key" ON "GradeSubject"("gradeId", "subjectId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherId_idx" ON "TeacherAssignment"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_gradeId_subjectId_key" ON "TeacherAssignment"("teacherId", "gradeId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacherAssignment_gradeId_key" ON "ClassTeacherAssignment"("gradeId");

-- CreateIndex
CREATE INDEX "ClassTeacherAssignment_teacherId_idx" ON "ClassTeacherAssignment"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_year_key" ON "AcademicYear"("schoolId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Term_academicYearId_name_key" ON "Term"("academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Examination_termId_gradeId_name_key" ON "Examination"("termId", "gradeId", "name");

-- CreateIndex
CREATE INDEX "Result_studentId_idx" ON "Result"("studentId");

-- CreateIndex
CREATE INDEX "Result_examinationId_idx" ON "Result"("examinationId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_subjectId_examinationId_key" ON "Result"("studentId", "subjectId", "examinationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_schoolId_termId_key" ON "Subscription"("schoolId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_schoolId_idx" ON "Payment"("schoolId");

-- CreateIndex
CREATE INDEX "Payment_termId_idx" ON "Payment"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationPayment_transactionCode_key" ON "ActivationPayment"("transactionCode");

-- CreateIndex
CREATE INDEX "ActivationPayment_schoolId_idx" ON "ActivationPayment"("schoolId");

-- CreateIndex
CREATE INDEX "ActivationPayment_status_idx" ON "ActivationPayment"("status");

-- CreateIndex
CREATE INDEX "ActivationPayment_verifiedById_idx" ON "ActivationPayment"("verifiedById");

-- CreateIndex
CREATE INDEX "LearningResource_gradeLevel_idx" ON "LearningResource"("gradeLevel");

-- CreateIndex
CREATE INDEX "LearningResource_subjectId_idx" ON "LearningResource"("subjectId");

-- CreateIndex
CREATE INDEX "LearningResource_published_idx" ON "LearningResource"("published");

-- CreateIndex
CREATE INDEX "Quiz_teacherId_idx" ON "Quiz"("teacherId");

-- CreateIndex
CREATE INDEX "Quiz_gradeId_idx" ON "Quiz"("gradeId");

-- CreateIndex
CREATE INDEX "Quiz_subjectId_idx" ON "Quiz"("subjectId");

-- CreateIndex
CREATE INDEX "Quiz_published_idx" ON "Quiz"("published");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizOption_questionId_idx" ON "QuizOption"("questionId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "QuizAttempt_completedAt_idx" ON "QuizAttempt"("completedAt");

-- CreateIndex
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- CreateIndex
CREATE INDEX "QuizAnswer_optionId_idx" ON "QuizAnswer"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key" ON "QuizAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "ParentContact_schoolId_idx" ON "ParentContact"("schoolId");

-- CreateIndex
CREATE INDEX "ParentContact_studentId_idx" ON "ParentContact"("studentId");

-- CreateIndex
CREATE INDEX "ParentContact_phoneNumber_idx" ON "ParentContact"("phoneNumber");

-- CreateIndex
CREATE INDEX "Announcement_schoolId_idx" ON "Announcement"("schoolId");

-- CreateIndex
CREATE INDEX "Announcement_administratorId_idx" ON "Announcement"("administratorId");

-- CreateIndex
CREATE INDEX "Announcement_gradeId_idx" ON "Announcement"("gradeId");

-- CreateIndex
CREATE INDEX "Announcement_studentId_idx" ON "Announcement"("studentId");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE INDEX "AnnouncementRecipient_announcementId_idx" ON "AnnouncementRecipient"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementRecipient_parentContactId_idx" ON "AnnouncementRecipient"("parentContactId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRecipient_announcementId_parentContactId_key" ON "AnnouncementRecipient"("announcementId", "parentContactId");

-- CreateIndex
CREATE INDEX "ParentAccount_schoolId_idx" ON "ParentAccount"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentAccount_schoolId_phoneNumber_key" ON "ParentAccount"("schoolId", "phoneNumber");

-- CreateIndex
CREATE INDEX "ParentAccountContact_parentAccountId_idx" ON "ParentAccountContact"("parentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentAccountContact_parentAccountId_parentContactId_key" ON "ParentAccountContact"("parentAccountId", "parentContactId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentSession_token_key" ON "ParentSession"("token");

-- CreateIndex
CREATE INDEX "ParentSession_parentAccountId_idx" ON "ParentSession"("parentAccountId");

-- CreateIndex
CREATE INDEX "ParentSession_expiresAt_idx" ON "ParentSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_parentAccountId_idx" ON "PushSubscription"("parentAccountId");

-- CreateIndex
CREATE INDEX "LoginAttempt_blockedUntil_idx" ON "LoginAttempt"("blockedUntil");

-- CreateIndex
CREATE INDEX "LoginAttempt_updatedAt_idx" ON "LoginAttempt"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_loginType_identifier_ipAddress_key" ON "LoginAttempt"("loginType", "identifier", "ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LoginIpAttempt_ipAddress_key" ON "LoginIpAttempt"("ipAddress");

-- CreateIndex
CREATE INDEX "LoginIpAttempt_blockedUntil_idx" ON "LoginIpAttempt"("blockedUntil");

-- CreateIndex
CREATE INDEX "LoginIpAttempt_updatedAt_idx" ON "LoginIpAttempt"("updatedAt");

-- AddForeignKey
ALTER TABLE "Administrator" ADD CONSTRAINT "Administrator_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministratorSession" ADD CONSTRAINT "AdministratorSession_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "Administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSession" ADD CONSTRAINT "TeacherSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacherAssignment" ADD CONSTRAINT "ClassTeacherAssignment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacherAssignment" ADD CONSTRAINT "ClassTeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examination" ADD CONSTRAINT "Examination_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examination" ADD CONSTRAINT "Examination_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "Examination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationPayment" ADD CONSTRAINT "ActivationPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationPayment" ADD CONSTRAINT "ActivationPayment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "Administrator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuizOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentContact" ADD CONSTRAINT "ParentContact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentContact" ADD CONSTRAINT "ParentContact_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "Administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRecipient" ADD CONSTRAINT "AnnouncementRecipient_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRecipient" ADD CONSTRAINT "AnnouncementRecipient_parentContactId_fkey" FOREIGN KEY ("parentContactId") REFERENCES "ParentContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAccount" ADD CONSTRAINT "ParentAccount_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAccountContact" ADD CONSTRAINT "ParentAccountContact_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAccountContact" ADD CONSTRAINT "ParentAccountContact_parentContactId_fkey" FOREIGN KEY ("parentContactId") REFERENCES "ParentContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentSession" ADD CONSTRAINT "ParentSession_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the existing Row-Level Security state for application tables.
ALTER TABLE "public"."AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ActivationPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Administrator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdministratorSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AnnouncementRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ClassTeacherAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Examination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GradeSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LearningResource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LoginIpAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParentAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParentAccountContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParentContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParentSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Result" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StudentSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TeacherAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TeacherSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Term" ENABLE ROW LEVEL SECURITY;
