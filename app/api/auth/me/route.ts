import { NextResponse } from "next/server";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { getCurrentTeacher } from "@/lib/teacher-session";
import { getCurrentStudent } from "@/lib/student-session";

export async function GET() {
  const administrator = await getCurrentAdministrator();

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

  const teacher = await getCurrentTeacher();

  if (teacher) {
    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        assignments: teacher.assignments,
      },
    });
  }

  const student = await getCurrentStudent();

  if (student) {
    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,

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

  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  );
}
