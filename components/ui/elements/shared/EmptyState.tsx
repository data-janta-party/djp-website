import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/atoms/Card';

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
  id = 'empty-state',
  ...props
}: EmptyStateProps) {
  return (
    <Card id={id} className="w-full max-w-md" {...props}>
      <CardHeader id="empty-state-header">
        <CardTitle id="empty-state-title">{title}</CardTitle>
        <CardDescription id="empty-state-description">{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent id="empty-state-action">{action}</CardContent> : null}
    </Card>
  );
}
