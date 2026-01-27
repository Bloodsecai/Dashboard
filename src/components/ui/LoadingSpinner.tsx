interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const borderSizes = {
    sm: 'border-2',
    md: 'border-[3px]',
    lg: 'border-4',
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      {/* Outer glow */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-primary-purple to-primary-pink opacity-20 blur-md`} />

      {/* Spinner */}
      <div
        className={`animate-spin rounded-full ${borderSizes[size]} border-white/10 ${sizes[size]}`}
        style={{
          borderTopColor: '#7c3aed',
          borderRightColor: '#ec4899',
        }}
      />
    </div>
  );
};

export { LoadingSpinner };
