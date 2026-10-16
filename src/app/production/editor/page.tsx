import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { ProductionEditor } from "@/components/modules/production/production-editor";

export default async function ProductionEditorPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Role check
  if (!["CEO", "FACTORY_MANAGER", "PRODUCTION_MANAGER"].includes(session.role)) {
    redirect("/production/dashboard");
  }

  return (
    <AppLayout
      user={session}
      headerTitle="DINUSHA EMBROIDERY"
      headerSubtitle="Weliweriya Factory — Production Dashboard Editor (13 Machines)"
    >
      <ProductionEditor />
    </AppLayout>
  );
}
