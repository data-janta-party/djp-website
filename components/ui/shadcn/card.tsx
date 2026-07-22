import * as React from 'react';

import { cn } from '@/lib/utils/index';

function Card({ className, id, ...props }: React.ComponentProps<'div'>) {
  const autoId = React.useId();

  return (
    <div
      id={id ?? autoId}
      data-slot="card"
      className={cn(
        'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, id, ...props }: React.ComponentProps<'div'>) {
  const autoId = React.useId();

  return (
    <div
      id={id ?? autoId}
      data-slot="card-header"
      className={cn('grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6', className)}
      {...props}
    />
  );
}

function CardTitle({ className, id, ...props }: React.ComponentProps<'div'>) {
  const autoId = React.useId();

  return (
    <div
      id={id ?? autoId}
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, id, ...props }: React.ComponentProps<'div'>) {
  const autoId = React.useId();

  return (
    <div
      id={id ?? autoId}
      data-slot="card-description"
      className={cn('text-md text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardContent({ className, id, ...props }: React.ComponentProps<'div'>) {
  const autoId = React.useId();

  return (
    <div
      id={id ?? autoId}
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  );
}

function CardFooter({ className, id, ...props }: React.ComponentProps<'div'>) {
  const autoId = React.useId();

  return (
    <div
      id={id ?? autoId}
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
