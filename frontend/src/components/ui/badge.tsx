import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gold/20 text-gold hover:bg-gold/30',
        secondary:
          'border-transparent bg-surface text-text-secondary hover:bg-surface-hover border-border-glass',
        destructive:
          'border-transparent bg-status-error/20 text-status-error hover:bg-status-error/30',
        success:
          'border-transparent bg-status-success/20 text-status-success hover:bg-status-success/30',
        warning:
          'border-transparent bg-status-warning/20 text-status-warning hover:bg-status-warning/30',
        outline: 'text-text-primary border-border-glass',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
