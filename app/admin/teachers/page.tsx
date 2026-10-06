import { requireActiveSchoolAdministrator } from "@/lib/school-access";
import TeachersPage from "./page-client";

export default async function Page() {
  await requireActiveSchoolAdministrator();
  return <TeachersPage />;
}
