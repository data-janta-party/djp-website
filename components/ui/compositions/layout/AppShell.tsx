'use client';

import type { ReactNode } from 'react';

import { Footer } from '@/components/ui/compositions/layout/Footer';
import { useLocale } from '@/hooks/useLocale';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  navbar?: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ children, navbar, footer }: AppShellProps) {
  const { messages } = useLocale();

  return (
    <div id="app-shell" className="flex min-h-screen flex-col bg-app-bg text-app-text">
      <a href="#main-content" className="skip-link" id="tpl-components-ui-compositions-layout-app-shell-l19-c7">
        {messages.common.skipToMain}
      </a>
      {navbar}
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      {footer ?? <Footer />}
    </div>
  );
}
