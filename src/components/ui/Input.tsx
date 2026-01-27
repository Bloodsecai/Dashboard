import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'filled' | 'glass';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon: Icon, variant = 'default', ...props }, ref) => {
    const baseClasses = 'w-full rounded-xl text-white placeholder-text-muted transition-all duration-300 focus:outline-none';

    const variants = {
      default: 'px-4 py-3 bg-white/5 border border-white/10 focus:border-primary-purple/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)]',
      filled: 'px-4 py-3 bg-white/10 border-0 focus:bg-white/[0.15] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]',
      glass: 'px-4 py-3 glass border border-white/10 focus:border-primary-purple/50',
    };

    const iconClasses = Icon ? 'pl-11' : '';
    const errorClasses = error ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : '';

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              baseClasses,
              variants[variant],
              iconClasses,
              errorClasses,
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-danger flex items-center gap-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
