import { redirect } from 'next/navigation';
import { checkErpSessionAction } from '@/actions/auth';
import { fetchEmployeesAction } from '@/actions/employees';
import { fetchProductionBundleAction } from '@/actions/production';
import { fetchQualityBundleAction } from '@/actions/quality';
import { fetchQuotationsAction } from '@/actions/quotations';
import { fetchStyleInOutBundleAction } from '@/actions/style-in-out';
import { PayrollManager } from '@/components/payroll/payroll-manager';

export const dynamic = 'force-dynamic';

export default async function ErpWorkspacePage() {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    redirect('/?login=1');
  }

  const [empRes, prodRes, qualRes, quotRes, styleInOutRes] = await Promise.all([
    fetchEmployeesAction(),
    fetchProductionBundleAction(),
    fetchQualityBundleAction(),
    fetchQuotationsAction(),
    fetchStyleInOutBundleAction(),
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
  const quotations = quotRes.success && quotRes.data ? quotRes.data : [];
  const styleInOutBundle =
    styleInOutRes.success && styleInOutRes.data
      ? styleInOutRes.data
      : { cloudReady: false, batches: [], bundles: [], despatches: [] };

  return (
    <PayrollManager
      initialEmployees={employees}
      initialProductionBundle={productionBundle}
      initialQualityBundle={qualityBundle}
      initialQuotations={quotations}
      initialStyleInOutBundle={styleInOutBundle}
      sessionInfo={{
        userId: session.userId,
        email: session.email,
        userLabel: session.userLabel,
        role: session.role,
        allowedModules: session.allowedModules,
      }}
    />
  );
}
