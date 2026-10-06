import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentParent } from "@/lib/parent-session";

function calculateCompetitionPosition(
  totals: { studentId: string; totalMarks: number }[],
  studentId: string,
) {
  const sorted = [...totals].sort((a, b) => {
    if (b.totalMarks !== a.totalMarks) {
      return b.totalMarks - a.totalMarks;
    }

    return a.studentId.localeCompare(b.studentId);
  });

  let previousMarks: number | null = null;
  let previousPosition = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index];
    const position = index + 1;

    let currentPosition: number;

    if (previousMarks === row.totalMarks) {
      currentPosition = previousPosition;
    } else {
      currentPosition = position;
      previousPosition = position;
      previousMarks = row.totalMarks;
    }

    if (row.studentId === studentId) {
      return currentPosition;
    }
  }

  return null;
}

function getCbcPerformance(marks: number) {
  if (marks >= 75 && marks <= 100) {
    return {
      level: "EE",
      points: 8,
    };
  }

  if (marks >= 51 && marks <= 74) {
    return {
      level: "ME",
      points: 6,
    };
  }

  if (marks >= 25 && marks <= 50) {
    return {
      level: "AE",
      points: 4,
    };
  }

  if (marks >= 1 && marks <= 24) {
    return {
      level: "BE",
      points: 2,
    };
  }

  return {
    level: "BE",
    points: 0,
  };
}

export async function GET(request: Request) {
  try {
    const parent = await getCurrentParent();

    if (!parent) {
      return NextResponse.json(
        { error: "Parent authentication required" },
        { status: 401 },
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const studentId = searchParams.get("studentId")?.trim() || "";

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 },
      );
    }

    const linkedContact = parent.contacts.find(
      (link) => link.parentContact.studentId === studentId,
    );

    if (!linkedContact) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to view results for this student.",
        },
        { status: 403 },
      );
    }

    const student = await prisma.student.findUnique({
      where: {
        id: linkedContact.parentContact.studentId,
      },
      include: {
        grade: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "The linked student could not be found." },
        { status: 404 },
      );
    }

    if (student.schoolId !== parent.schoolId) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to view this student's results.",
        },
        { status: 403 },
      );
    }

    const examinations = await prisma.examination.findMany({
      where: {
        gradeId: student.gradeId,
        grade: {
          schoolId: parent.schoolId,
        },
      },
      include: {
        grade: true,
        term: {
          include: {
            academicYear: true,
          },
        },
      },
      orderBy: [
        {
          term: {
            academicYear: {
              year: "desc",
            },
          },
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const results = await prisma.result.findMany({
      where: {
        studentId: student.id,
        examination: {
          gradeId: student.gradeId,
          grade: {
            schoolId: parent.schoolId,
          },
        },
      },
      include: {
        subject: true,
        examination: {
          include: {
            grade: true,
            term: {
              include: {
                academicYear: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const examinationIds = examinations.map(
      (examination) => examination.id,
    );

    const allExaminationResults =
      examinationIds.length > 0
        ? await prisma.result.findMany({
            where: {
              examinationId: {
                in: examinationIds,
              },
              student: {
                schoolId: parent.schoolId,
                gradeId: student.gradeId,
              },
            },
            select: {
              studentId: true,
              examinationId: true,
              marks: true,
            },
          })
        : [];

    const totalsByExamination = new Map<
      string,
      Map<string, number>
    >();

    for (const result of allExaminationResults) {
      if (!totalsByExamination.has(result.examinationId)) {
        totalsByExamination.set(
          result.examinationId,
          new Map<string, number>(),
        );
      }

      const studentTotals =
        totalsByExamination.get(result.examinationId)!;

      studentTotals.set(
        result.studentId,
        (studentTotals.get(result.studentId) || 0) +
          result.marks,
      );
    }

    const positionByExamination = new Map<
      string,
      number | null
    >();

    const totalByExamination = new Map<string, number>();

    for (const examination of examinations) {
      const studentTotals =
        totalsByExamination.get(examination.id);

      if (!studentTotals) {
        continue;
      }

      const totals = Array.from(studentTotals.entries()).map(
        ([resultStudentId, totalMarks]) => ({
          studentId: resultStudentId,
          totalMarks,
        }),
      );

      const studentTotal =
        studentTotals.get(student.id);

      if (studentTotal !== undefined) {
        totalByExamination.set(
          examination.id,
          studentTotal,
        );
      }

      positionByExamination.set(
        examination.id,
        calculateCompetitionPosition(
          totals,
          student.id,
        ),
      );
    }

    const child = {
      parentContactId: linkedContact.parentContact.id,
      studentId: student.id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      grade: student.grade.name,
      school: parent.school.name,
      relationship: linkedContact.parentContact.relationship,
    };

    return NextResponse.json({
      child,
      results: results.map((result) => {
        const performance = getCbcPerformance(result.marks);

        return {
          id: result.id,
          subject: result.subject.name,
          marks: result.marks,
          performanceLevel: performance.level,
          points: performance.points,
          examination: result.examination.name,
          examinationId: result.examinationId,
          grade: result.examination.grade.name,
          term: result.examination.term.name,
          academicYear:
            result.examination.term.academicYear.year,
          totalMarks:
            totalByExamination.get(result.examinationId) ?? 0,
          position:
            positionByExamination.get(result.examinationId) ??
            null,
        };
      }),
    });
  } catch (error) {
    console.error(
      "Error fetching parent child results:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to fetch student results" },
      { status: 500 },
    );
  }
}