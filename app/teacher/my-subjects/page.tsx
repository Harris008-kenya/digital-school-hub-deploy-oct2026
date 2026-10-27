import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { prisma } from "@/lib/prisma";

export default async function TeacherMySubjectsPage() {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    redirect("/login");
  }

  const configuredGradeSubjects = await prisma.gradeSubject.findMany({
    where: {
      grade: {
        schoolId: teacher.schoolId,
      },
    },
    select: {
      grade: {
        select: {
          id: true,
          name: true,
          level: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const subjectMap = new Map<
    string,
    {
      id: string;
      name: string;
      grades: {
        id: string;
        level: number;
        name: string;
      }[];
    }
  >();

  const gradeMap = new Map<
    string,
    {
      id: string;
      level: number;
      name: string;
    }
  >();

  for (const item of configuredGradeSubjects) {
    const subject = item.subject;
    const grade = item.grade;

    gradeMap.set(grade.id, {
      id: grade.id,
      level: grade.level,
      name: grade.name,
    });

    const existingSubject = subjectMap.get(subject.id);

    if (existingSubject) {
      const alreadyAdded = existingSubject.grades.some(
        (existingGrade) => existingGrade.id === grade.id
      );

      if (!alreadyAdded) {
        existingSubject.grades.push({
          id: grade.id,
          level: grade.level,
          name: grade.name,
        });
      }
    } else {
      subjectMap.set(subject.id, {
        id: subject.id,
        name: subject.name,
        grades: [
          {
            id: grade.id,
            level: grade.level,
            name: grade.name,
          },
        ],
      });
    }
  }

  const subjects = Array.from(subjectMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  for (const subject of subjects) {
    subject.grades.sort(
      (a, b) => a.level - b.level
    );
  }

  const grades = Array.from(gradeMap.values()).sort(
    (a, b) => a.level - b.level
  );

  const subjectCount = subjects.length;
  const gradeCount = grades.length;
  const assignmentCount = configuredGradeSubjects.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Teacher Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Teacher Dashboard
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Teacher Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            My Subjects
          </h2>

          <p className="mt-3 max-w-3xl text-blue-100">
            Welcome, {teacher.name}. View the subjects you teach and
            the grades assigned to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-700">
              {subjectCount}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Unique subjects offered by your school
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Classes
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {gradeCount}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Grades configured by your school
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Grade-Subject Combinations
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-800">
              {assignmentCount}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Configured combinations across your school&apos;s grades
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-900">
            Subjects Offered by My School
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            These subjects and grades are based on the subjects configured
            for your school.
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              No subjects assigned
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your school has not configured any subjects yet. Please
              contact the School Administrator.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <article
                key={subject.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                  {"\u{1F4DA}"}
                </div>

                <h4 className="mt-5 text-xl font-bold text-slate-900">
                  {subject.name}
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Grades assigned
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {subject.grades.map((grade) => (
                    <span
                      key={grade.id}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 ring-1 ring-blue-100"
                    >
                      {grade.name}
                    </span>
                  ))}
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-sm text-slate-500">
                    Number of grades
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {subject.grades.length}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          {"\u00A9"} 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}