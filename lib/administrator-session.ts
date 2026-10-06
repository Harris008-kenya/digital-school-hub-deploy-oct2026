import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ADMINISTRATOR_SESSION_COOKIE = "dsh_administrator_session";

export async function getCurrentAdministrator() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    ADMINISTRATOR_SESSION_COOKIE
  )?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.administratorSession.findUnique({
    where: {
      token,
    },
    include: {
      administrator: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.administratorSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.administrator;
}