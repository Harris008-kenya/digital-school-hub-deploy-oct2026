import { requireActiveSchoolAdministrator } from "@/lib/school-access";
import StudentsPage from "./page-client";

export default async function Page() {
  await requireActiveSchoolAdministrator();
  return <StudentsPage />;
}
