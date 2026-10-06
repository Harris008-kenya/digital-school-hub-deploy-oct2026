import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getActiveSchoolAdministrator } from "@/lib/school-api-access";

export async function POST(request: Request) {
  try {
    const access = await getActiveSchoolAdministrator();

    if (!access.administrator) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (access.administrator.role !== "SCHOOL") {
      return NextResponse.json(
        {
          error:
            "Only school administrators can create parent accounts.",
        },
        { status: 403 }
      );
    }

    if (!access.school) {
      return NextResponse.json(
        {
          error: "Your school was not found.",
        },
        { status: 404 }
      );
    }

    const school = access.school;

    const body = await request.json();

    const parentContactId =
      typeof body.parentContactId === "string"
        ? body.parentContactId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const phoneNumber =
      typeof body.phoneNumber === "string"
        ? body.phoneNumber.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!parentContactId || !name || !phoneNumber || !password) {
      return NextResponse.json(
        {
          error:
            "Parent contact, name, phone number and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    const parentContact =
      await prisma.parentContact.findFirst({
        where: {
          id: parentContactId,
          schoolId: school.id,
        },
      });

    if (!parentContact) {
      return NextResponse.json(
        {
          error:
            "The selected parent contact does not belong to your school.",
        },
        { status: 404 }
      );
    }

    const existingAccount =
      await prisma.parentAccount.findUnique({
        where: {
          schoolId_phoneNumber: {
            schoolId: school.id,
            phoneNumber,
          },
        },
      });

    if (existingAccount) {
      const existingLink =
        await prisma.parentAccountContact.findUnique({
          where: {
            parentAccountId_parentContactId: {
              parentAccountId: existingAccount.id,
              parentContactId: parentContact.id,
            },
          },
        });

      if (existingLink) {
        return NextResponse.json(
          {
            error:
              "This parent contact is already linked to this parent account.",
          },
          { status: 409 }
        );
      }

      const accountLink =
        await prisma.parentAccountContact.create({
          data: {
            parentAccountId: existingAccount.id,
            parentContactId: parentContact.id,
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "The parent contact has been linked to the existing parent account.",
        parentAccountId: existingAccount.id,
        linkId: accountLink.id,
      });
    }

    const hashedPassword = await hash(password, 12);

    const parentAccount =
      await prisma.parentAccount.create({
        data: {
          schoolId: school.id,
          name,
          phoneNumber,
          password: hashedPassword,
          contacts: {
            create: {
              parentContactId: parentContact.id,
            },
          },
        },
        include: {
          contacts: {
            include: {
              parentContact: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Parent account created successfully.",
        parentAccount: {
          id: parentAccount.id,
          name: parentAccount.name,
          phoneNumber: parentAccount.phoneNumber,
          contacts: parentAccount.contacts,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Parent registration error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating the parent account.",
      },
      { status: 500 }
    );
  }
}