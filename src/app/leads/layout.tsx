import AppShell from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return <AppShell role={session.role}>{children}</AppShell>;
}
