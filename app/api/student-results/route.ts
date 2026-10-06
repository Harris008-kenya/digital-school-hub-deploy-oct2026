import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-session";

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

function getCbcLevel(marks: number) {
  if (marks >= 75) {
    return "EE";
  }

  if (marks >= 51) {
    return "ME";
  }

  if (marks >= 25) {
    return "AE";
  }

  return "BE";
}

function getCbcPoints(marks: number) {
  if (marks >= 75) {
    return 8;
  }

  if (marks >= 51) {
    return 6;
  }

  if (marks >= 25) {
    return 4;
  }

  return 2;
}

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 },
      );
    }

    /*
     * Find all examinations belonging to the student's
     * grade and school.
     */
    const examinations = await prisma.examination.findMany({
      where: {
        gradeId: student.gradeId,
        grade: {
          schoolId: student.schoolId,
        },
      },
      include: {
        term: {
          include: {
            academicYear: true,
          },
        },
        grade: true,
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

    /*
     * Get the logged-in student's individual subject results.
     */
    const results = await prisma.result.findMany({
      where: {
        studentId: student.id,
        examination: {
          gradeId: student.gradeId,
          grade: {
            schoolId: student.schoolId,
          },
        },
      },
      include: {
        subject: true,
        examination: {
          include: {
            term: {
              include: {
                academicYear: true,
              },
            },
            grade: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    /*
     * Get all students' results for the relevant examinations.
     * This is used to calculate positions within the student's
     * grade using total marks.
     */
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
                schoolId: student.schoolId,
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

    /*
     * examinationId -> studentId -> total marks
     */
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

    /*
     * Store the logged-in student's total and position
     * for every examination.
     */
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
        ([studentId, totalMarks]) => ({
          studentId,
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

    /*
     * Group the student's subject results by examination.
     *
     * Previously the API returned:
     *
     *   subject 1
     *   subject 2
     *   subject 3
     *
     * as separate examination records.
     *
     * Now all subjects belonging to the same examination
     * are placed inside one subjectResults array.
     */
    const groupedResults = new Map<
      string,
      {
        id: string;
        examinationId: string;
        examinationName: string;
        termName: string;
        academicYearName: string;
        gradeName: string;
        totalMarks: number;
        position: number | null;
        subjectResults: {
          subjectId: string;
          subjectName: string;
          marks: number;
          cbcLevel: string;
          cbcPoints: number;
        }[];
      }
    >();

    for (const result of results) {
      const examinationId = result.examinationId;

      if (!groupedResults.has(examinationId)) {
        groupedResults.set(examinationId, {
          id: examinationId,
          examinationId,
          examinationName: result.examination.name,
          termName: result.examination.term.name,
          academicYearName: String(
            result.examination.term.academicYear.year,
          ),
          gradeName: result.examination.grade.name,
          totalMarks:
            totalByExamination.get(examinationId) ?? 0,
          position:
            positionByExamination.get(examinationId) ?? null,
          subjectResults: [],
        });
      }

      const examinationResult =
        groupedResults.get(examinationId)!;

      examinationResult.subjectResults.push({
        subjectId: result.subject.id,
        subjectName: result.subject.name,
        marks: Number(result.marks),
        cbcLevel: getCbcLevel(Number(result.marks)),
        cbcPoints: getCbcPoints(Number(result.marks)),
      });
    }

    /*
     * Convert the grouped Map into the array expected by
     * app/student/page.tsx.
     */
    const groupedResultArray = Array.from(
      groupedResults.values(),
    );

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        grade: student.grade.name,
        school: student.school.name,
      },

      results: groupedResultArray,
    });
  } catch (error) {
    console.error(
      "Error loading student results:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to load examination results" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return GET();
}