import { requireActiveSchoolAdministrator } from "@/lib/school-access";
import ExaminationsPage from "./page-client";

export default async function Page() {
  await requireActiveSchoolAdministrator();

  return <ExaminationsPage />;
}