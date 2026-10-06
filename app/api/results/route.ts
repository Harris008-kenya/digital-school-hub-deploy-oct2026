import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";
import { prisma } from "@/lib/prisma";

type ResultInput = {
studentId?: unknown;
marks?: unknown;
};

async function findExaminationSubject(
examinationId: string,
subjectId: string,
) {
const examination = await prisma.examination.findUnique({
where: {
id: examinationId,
},
include: {
grade: true,
},
});

if (!examination) {
return {
error: "The selected examination was not found",
};
}

const gradeSubject = await prisma.gradeSubject.findUnique({
where: {
gradeId_subjectId: {
gradeId: examination.gradeId,
subjectId,
},
},
include: {
subject: true,
},
});

if (!gradeSubject) {
return {
error:
"This subject is not assigned to the examination grade",
};
}

return {
examination,
gradeSubject,
};
}

async function checkAccess(
examinationId: string,
subjectId: string,
) {
const administrator = await getCurrentAdministrator();

if (administrator) {
if (administrator.role === "PLATFORM") {
const selected = await findExaminationSubject(
examinationId,
subjectId,
);

  if ("error" in selected) {
    return {
      error: selected.error,
      status: 404,
    };
  }

  return {
    type: "PLATFORM" as const,
    examination: selected.examination,
    gradeSubject: selected.gradeSubject,
  };
}

const access =
  await getActiveSchoolAdministrator();

if (!access.administrator) {
  return {
    error: access.error,
    status: access.status,
  };
}

if (!access.school) {
  return {
    error: "Your school was not found",
    status: 404,
  };
}

const school = access.school;

const selected = await findExaminationSubject(
  examinationId,
  subjectId,
);

if ("error" in selected) {
  return {
    error: selected.error,
    status: 404,
  };
}

if (
  selected.examination.grade.schoolId !==
  school.id
) {
  return {
    error:
      "You are not authorized to access results for this school",
    status: 403,
  };
}

return {
  type: "SCHOOL_ADMIN" as const,
  schoolId: school.id,
  examination: selected.examination,
  gradeSubject: selected.gradeSubject,
};

}

const teacher = await getCurrentTeacher();

if (!teacher) {
return {
error: "Administrator or teacher sign-in is required",
status: 401,
};
}

const selected = await findExaminationSubject(
examinationId,
subjectId,
);

if ("error" in selected) {
return {
error: selected.error,
status: 404,
};
}

if (
selected.examination.grade.schoolId !==
teacher.schoolId
) {
return {
error:
"You are not authorized to access results for this school",
status: 403,
};
}

const assignment = teacher.assignments.find(
(item) =>
item.gradeId === selected.examination.gradeId &&
item.subjectId === subjectId,
);

if (!assignment) {
return {
error:
"You are not assigned to this subject and grade",
status: 403,
};
}

return {
type: "TEACHER" as const,
teacher,
examination: selected.examination,
gradeSubject: selected.gradeSubject,
};
}

export async function GET(request: Request) {
const searchParams = new URL(request.url).searchParams;

const examinationId =
searchParams.get("examinationId") || "";

const subjectId =
searchParams.get("subjectId") || "";

if (!examinationId || !subjectId) {
return NextResponse.json(
{
error:
"examinationId and subjectId are required",
},
{ status: 400 },
);
}

try {
const access = await checkAccess(
examinationId,
subjectId,
);

if ("error" in access) {
  return NextResponse.json(
    { error: access.error },
    { status: access.status },
  );
}

const [students, results] = await Promise.all([
  prisma.student.findMany({
    where: {
      gradeId: access.examination.gradeId,
      schoolId:
        access.examination.grade.schoolId,
    },
    select: {
      id: true,
      name: true,
      admissionNumber: true,
    },
    orderBy: {
      name: "asc",
    },
  }),

  prisma.result.findMany({
    where: {
      examinationId,
      subjectId,
      student: {
        schoolId:
          access.examination.grade.schoolId,
      },
    },
    select: {
      id: true,
      studentId: true,
      marks: true,
      updatedAt: true,
    },
  }),
]);

const resultsByStudent = new Map(
  results.map((result) => [
    result.studentId,
    result,
  ]),
);

return NextResponse.json({
  examination: access.examination,
  subject: access.gradeSubject.subject,
  students: students.map((student) => ({
    student,
    result:
      resultsByStudent.get(student.id) ?? null,
  })),
});

} catch (error) {
console.error(
"Error fetching results sheet:",
error,
);

return NextResponse.json(
  {
    error: "Failed to fetch results sheet",
  },
  { status: 500 },
);

}
}

export async function POST(request: Request) {
try {
const body = await request.json();

const examinationId =
  typeof body.examinationId === "string"
    ? body.examinationId
    : "";

const subjectId =
  typeof body.subjectId === "string"
    ? body.subjectId
    : "";

const entries = Array.isArray(body.results)
  ? (body.results as ResultInput[])
  : [];

if (
  !examinationId ||
  !subjectId ||
  entries.length === 0
) {
  return NextResponse.json(
    {
      error:
        "An examination, subject and at least one mark are required",
    },
    { status: 400 },
  );
}

const access = await checkAccess(
  examinationId,
  subjectId,
);

if ("error" in access) {
  return NextResponse.json(
    { error: access.error },
    { status: access.status },
  );
}

const marksByStudent = new Map<
  string,
  number
>();

for (const entry of entries) {
  const studentId =
    typeof entry.studentId === "string"
      ? entry.studentId
      : "";

  const marks =
    typeof entry.marks === "number"
      ? entry.marks
      : Number.NaN;

  if (
    !studentId ||
    !Number.isFinite(marks) ||
    marks < 0 ||
    marks > 100
  ) {
    return NextResponse.json(
      {
        error:
          "Each mark must be a number from 0 to 100",
      },
      { status: 400 },
    );
  }

  marksByStudent.set(studentId, marks);
}

const studentIds = [
  ...marksByStudent.keys(),
];

const students =
  await prisma.student.findMany({
    where: {
      id: {
        in: studentIds,
      },
      gradeId: access.examination.gradeId,
      schoolId:
        access.examination.grade.schoolId,
    },
    select: {
      id: true,
    },
  });

if (students.length !== studentIds.length) {
  return NextResponse.json(
    {
      error:
        "One or more learners do not belong to this examination grade",
    },
    { status: 400 },
  );
}

await prisma.$transaction(
  studentIds.map((studentId) =>
    prisma.result.upsert({
      where: {
        studentId_subjectId_examinationId: {
          studentId,
          subjectId,
          examinationId,
        },
      },
      update: {
        marks:
          marksByStudent.get(studentId)!,
      },
      create: {
        studentId,
        subjectId,
        examinationId,
        marks:
          marksByStudent.get(studentId)!,
      },
    }),
  ),
);

return NextResponse.json({
  saved: studentIds.length,
});

} catch (error) {
console.error(
"Error saving results:",
error,
);

return NextResponse.json(
  {
    error: "Failed to save results",
  },
  { status: 500 },
);

}
}
