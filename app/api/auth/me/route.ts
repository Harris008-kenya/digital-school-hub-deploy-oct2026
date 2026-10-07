import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  getCurrentAdministrator,
  ADMINISTRATOR_SESSION_COOKIE,
} from "@/lib/administrator-session";

import {
  getCurrentTeacher,
  TEACHER_SESSION_COOKIE,
} from "@/lib/teacher-session";

import {
  getCurrentStudent,
  STUDENT_SESSION_COOKIE,
} from "@/lib/student-session";

export async function GET() {
  try {
    const cookieStore = await cookies();

    /*
     * Check which type of user is currently signed in
     * before making any database session queries.
     *
     * This prevents a teacher request from first querying
     * AdministratorSession and prevents a student request
     * from unnecessarily querying unrelated sessions.
     */

    const administratorToken = cookieStore.get(
      ADMINISTRATOR_SESSION_COOKIE
    )?.value;

    if (administratorToken) {
      const administrator =
        await getCurrentAdministrator();

      if (administrator) {
        return NextResponse.json({
          administrator: {
            id: administrator.id,
            name: administrator.name,
            email: administrator.email,
            role: administrator.role,
            schoolId: administrator.schoolId,
          },
        });
      }
    }

    const teacherToken = cookieStore.get(
      TEACHER_SESSION_COOKIE
    )?.value;

    if (teacherToken) {
      const teacher = await getCurrentTeacher();

      if (teacher) {
        return NextResponse.json({
          teacher: {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            assignments: teacher.assignments,
            classTeacherAssignments:
              teacher.classTeacherAssignments,
          },
        });
      }
    }

    const studentToken = cookieStore.get(
      STUDENT_SESSION_COOKIE
    )?.value;

    if (studentToken) {
      const student = await getCurrentStudent();

      if (student) {
        return NextResponse.json({
          student: {
            id: student.id,
            name: student.name,
            admissionNumber:
              student.admissionNumber,

            schoolId: student.schoolId,
            schoolName: student.school.name,

            school: {
              id: student.school.id,
              name: student.school.name,
            },

            gradeId: student.gradeId,
            gradeName: student.grade.name,

            grade: {
              id: student.grade.id,
              name: student.grade.name,
              level: student.grade.level,
            },
          },
        });
      }
    }

    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  } catch (error) {
    console.error(
      "Authentication information error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load authentication information",
      },
      { status: 500 }
    );
  }
}