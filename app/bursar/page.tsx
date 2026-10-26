import { redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";
import { hasSchoolAccess } from "@/lib/school-activation";
import BursarDashboard from "./BursarDashboard";

export const dynamic = "force-dynamic";

export default async function BursarPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  if (administrator.role === "PLATFORM" || administrator.role === "SCHOOL") {
    redirect("/admin");
  }

  if (administrator.role !== "BURSAR" || !administrator.schoolId) {
    redirect("/login");
  }

  const school = await prisma.school.findUnique({
    where: { id: administrator.schoolId },
    select: {
      id: true,
      isActive: true,
      activationExpiryDate: true,
    },
  });

  if (!school) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Bursar access unavailable</h1>
        <p className="mt-3">Your account is not linked to an existing school. Contact the platform administrator.</p>
      </main>
    );
  }

  if (!hasSchoolAccess(school)) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">School activation required</h1>
        <p className="mt-3">Your school must have active access before financial records can be used.</p>
      </main>
    );
  }

  return <BursarDashboard />;
}
