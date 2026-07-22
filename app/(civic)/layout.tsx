import { AppShell } from '@/components/ui/compositions/layout/AppShell';
import { CivicPulseFooter } from '@/components/ui/compositions/civic-pulse/CivicPulseFooter';
import { CivicPulseNavbar } from '@/components/ui/compositions/civic-pulse/CivicPulseNavbar';

export default function CivicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell navbar={<CivicPulseNavbar />} footer={<CivicPulseFooter />}>
      {children}
    </AppShell>
  );
}