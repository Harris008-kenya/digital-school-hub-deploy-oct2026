import { requireActiveSchoolAdministrator } from "@/lib/school-access";
import ResultsPage from "./page-client";

export default async function Page() {
  await requireActiveSchoolAdministrator();
  return <ResultsPage />;
}
