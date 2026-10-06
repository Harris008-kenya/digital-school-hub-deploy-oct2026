import { NextResponse } from "next/server";
import { getCurrentParent } from "@/lib/parent-session";

export async function GET() {
  try {
    const parent = await getCurrentParent();

    if (!parent) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      parent: {
        id: parent.id,
        name: parent.name,
        phoneNumber: parent.phoneNumber,
        school: {
          id: parent.school.id,
          name: parent.school.name,
          code: parent.school.code,
        },
        children: parent.contacts.map((link) => ({
          parentContactId: link.parentContact.id,
          studentId: link.parentContact.student.id,
          studentName: link.parentContact.student.name,
          relationship: link.parentContact.relationship,
        })),
      },
    });
  } catch (error) {
    console.error("Parent session check error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}