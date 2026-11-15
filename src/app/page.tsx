import { fetchEmployeesAction } from '@/actions/employees';
import { fetchProductionBundleAction } from '@/actions/production';
import { fetchQualityBundleAction } from '@/actions/quality';
import { PayrollManager } from '@/components/payroll/payroll-manager';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [empRes, prodRes, qualRes] = await Promise.all([
    fetchEmployeesAction(),
    fetchProductionBundleAction(),
    fetchQualityBundleAction(),
  ]);

  const employees = empRes.success && empRes.data ? empRes.data : [];
  const productionBundle =
    prodRes.success && prodRes.data
      ? prodRes.data
      : { companies: [], machines: [], styles: [], plans: [] };
  const qualityBundle =
    qualRes.success && qualRes.data
      ? qualRes.data
      : { checkers: [], blocks: [], deliveryTargets: [] };

  return (
    <PayrollManager
      initialEmployees={employees}
      initialProductionBundle={productionBundle}
      initialQualityBundle={qualityBundle}
    />
  );
}
