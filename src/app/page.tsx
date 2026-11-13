import { fetchEmployeesAction } from '@/actions/employees';
import { PayrollManager } from '@/components/payroll/payroll-manager';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const res = await fetchEmployeesAction();
  const employees = res.success && res.data ? res.data : [];

  return <PayrollManager initialEmployees={employees} />;
}
