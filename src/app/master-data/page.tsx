import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { MasterDataTabs } from "@/components/modules/master-data/master-data-tabs";

export default async function MasterDataPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Role check: Only CEO, FACTORY_MANAGER, and PRODUCTION_MANAGER have master data CRUD access
  if (!["CEO", "FACTORY_MANAGER", "PRODUCTION_MANAGER"].includes(session.role)) {
    redirect("/production/dashboard");
  }

  return (
    <AppLayout
      user={session}
      headerTitle="DINUSHA EMBROIDERY"
      headerSubtitle="Factory Master Data Catalog — Styles, Parts, Threads, Companies & Machines"
    >
      <MasterDataTabs />
    </AppLayout>
  );
}
