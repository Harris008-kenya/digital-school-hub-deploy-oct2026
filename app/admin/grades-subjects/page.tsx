import { requireActiveSchoolAdministrator } from "@/lib/school-access";
import GradesSubjectsPage from "./page-client";

export default async function Page() {
  await requireActiveSchoolAdministrator();

  return <GradesSubjectsPage />;
}