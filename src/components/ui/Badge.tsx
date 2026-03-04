interface BadgeProps {
  variant: 'high' | 'medium' | 'low' | 'info' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeProps['variant'], string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-pastel/50 text-turf',
  info: 'bg-green/90 text-white',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-600',
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${variantMap[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
