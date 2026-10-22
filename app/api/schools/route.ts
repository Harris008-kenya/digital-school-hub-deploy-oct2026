import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";

const GRADE_1_TO_6_SUBJECTS = [
  "Mathematics",
  "English",
  "Creative Arts",
  "Agriculture",
  "Social Studies",
  "Religion",
  "Kiswahili",
  "Science and Technology",
];

const GRADE_7_TO_9_SUBJECTS = [
  "Mathematics",
  "Agriculture",
  "Pretechnical Studies",
  "Social Studies",
  "Integrated Science",
  "English",
  "Kiswahili",
  "Creative Arts",
  "Religion",
];

export async function GET() {
  try {
    const now = new Date();

    const schools = await prisma.school.findMany({
      where: {
        isActive: true,
        activationExpiryDate: { gte: now },
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("Error fetching schools:", error);

    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const administrator = await getCurrentAdministrator();

    if (!administrator) {
      return NextResponse.json(
        { error: "Administrator sign-in is required" },
        { status: 401 },
      );
    }

    if (administrator.role !== "PLATFORM") {
      return NextResponse.json(
        {
          error: "Only a Platform Administrator can create schools",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const address =
      typeof body.address === "string" ? body.address.trim() : "";

    if (!name || !code) {
      return NextResponse.json(
        { error: "School name and school code are required" },
        { status: 400 },
      );
    }

    const existingSchool = await prisma.school.findUnique({
      where: { code },
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this code already exists" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name,
          code,
          email: email || null,
          phone: phone || null,
          address: address || null,
          isActive: false,
        },
      });

      const subjectNames = Array.from(
        new Set([
          ...GRADE_1_TO_6_SUBJECTS,
          ...GRADE_7_TO_9_SUBJECTS,
        ]),
      );

      const subjects = new Map<string, { id: string; name: string }>();

      for (const subjectName of subjectNames) {
        let subject = await tx.subject.findUnique({
          where: { name: subjectName },
          select: { id: true, name: true },
        });

        if (!subject) {
          subject = await tx.subject.create({
            data: { name: subjectName },
            select: { id: true, name: true },
          });
        }

        subjects.set(subjectName, subject);
      }

      const createdGrades: {
        id: string;
        level: number;
        name: string;
      }[] = [];

      for (let level = 1; level <= 9; level += 1) {
        const grade = await tx.grade.create({
          data: {
            name: `Grade ${level}`,
            level,
            schoolId: school.id,
          },
          select: {
            id: true,
            level: true,
            name: true,
          },
        });

        createdGrades.push(grade);
      }

      for (const grade of createdGrades) {
        const subjectNamesForGrade =
          grade.level <= 6
            ? GRADE_1_TO_6_SUBJECTS
            : GRADE_7_TO_9_SUBJECTS;

        await tx.gradeSubject.createMany({
          data: subjectNamesForGrade.map((subjectName) => ({
            gradeId: grade.id,
            subjectId: subjects.get(subjectName)!.id,
          })),
        });
      }

      return {
        school,
        gradesCreated: createdGrades.length,
        gradeSubjectAssignmentsCreated: createdGrades.reduce(
          (total, grade) =>
            total +
            (grade.level <= 6
              ? GRADE_1_TO_6_SUBJECTS.length
              : GRADE_7_TO_9_SUBJECTS.length),
          0,
        ),
      };
    });

    return NextResponse.json(
      {
        message:
          "School created successfully with Grades 1-9 and CBC subjects.",
        school: result.school,
        setup: {
          gradesCreated: result.gradesCreated,
          gradeSubjectAssignmentsCreated:
            result.gradeSubjectAssignmentsCreated,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating school:", error);

    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 },
    );
  }
}