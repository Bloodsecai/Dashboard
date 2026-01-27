import { clsx } from 'clsx';

interface BadgeProps {
  variant: 'paid' | 'pending' | 'refunded' | 'success' | 'warning' | 'danger' | 'active' | 'inactive' | 'info';
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const Badge = ({ variant, children, className, size = 'sm' }: BadgeProps) => {
  const variants = {
    paid: 'bg-success/15 text-success',
    pending: 'bg-warning/15 text-warning',
    refunded: 'bg-danger/15 text-danger',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    active: 'bg-success/15 text-success',
    inactive: 'bg-white/10 text-text-muted',
    info: 'bg-primary-purple/15 text-primary-purple',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium capitalize',
        variants[variant],
        sizes[size],
        className
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          {
            'bg-success': variant === 'paid' || variant === 'success' || variant === 'active',
            'bg-warning': variant === 'pending' || variant === 'warning',
            'bg-danger': variant === 'refunded' || variant === 'danger',
            'bg-text-muted': variant === 'inactive',
            'bg-primary-purple': variant === 'info',
          }
        )}
      />
      {children}
    </span>
  );
};

export { Badge };
