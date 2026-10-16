import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { FloorDashboard } from "@/components/modules/production/floor-dashboard";

export default async function ProductionDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppLayout
      user={session}
      headerTitle="DINUSHA EMBROIDERY"
      headerSubtitle="Weliweriya Factory — Floor Production Monitoring Dashboard (13 Machines)"
      showLiveTag={true}
    >
      <FloorDashboard />
    </AppLayout>
  );
}
