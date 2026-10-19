import { getProductionDashboardData } from '@/actions/production';
import { ProductionDashboard } from '@/components/modules/production/production-dashboard';

export const dynamic = 'force-dynamic';

export default async function ProductionPage() {
  const data = await getProductionDashboardData();

  return <ProductionDashboard initialData={data} />;
}
