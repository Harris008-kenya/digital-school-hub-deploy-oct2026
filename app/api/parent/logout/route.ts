import { NextResponse } from "next/server";
import { destroyParentSession } from "@/lib/parent-session";

export async function POST() {
  try {
    await destroyParentSession();

    return NextResponse.json({
      success: true,
      message: "Parent logged out successfully.",
    });
  } catch (error) {
    console.error("Parent logout error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred during logout.",
      },
      { status: 500 }
    );
  }
}