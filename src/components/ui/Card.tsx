import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'gradient' | 'glass' | 'metric';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, subtitle, icon: Icon, variant = 'default', padding = 'md', hoverable = true, children, ...props }, ref) => {
    const baseClasses = 'rounded-2xl transition-all duration-300';

    const variants = {
      default: 'glass-card',
      gradient: 'glass-purple',
      glass: 'glass',
      metric: 'metric-card glass-card',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverClasses = hoverable ? 'card-hover-lift cursor-default' : '';

    return (
      <div
        ref={ref}
        className={clsx(
          baseClasses,
          variants[variant],
          paddings[padding],
          hoverClasses,
          className
        )}
        {...props}
      >
        {(title || Icon) && (
          <div className="flex items-center gap-3 mb-4">
            {Icon && (
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary-purple/20 to-primary-pink/20">
                <Icon className="h-5 w-5 text-primary-purple" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-text-secondary">{subtitle}</p>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
