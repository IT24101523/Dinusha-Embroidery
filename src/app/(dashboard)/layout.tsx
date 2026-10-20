import { FactoryShell } from '@/components/layout/factory-shell';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FactoryShell>{children}</FactoryShell>;
}
