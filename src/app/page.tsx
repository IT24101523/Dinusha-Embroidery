import { checkErpSessionAction } from '@/actions/auth';
import { BusinessHome } from '@/components/home/business-home';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const [session, resolvedParams] = await Promise.all([
    checkErpSessionAction(),
    searchParams,
  ]);

  const promptLogin = resolvedParams?.login === '1' && !session.authenticated;

  return (
    <BusinessHome
      isLoggedIn={session.authenticated}
      userLabel={session.userLabel}
      promptLogin={promptLogin}
    />
  );
}
