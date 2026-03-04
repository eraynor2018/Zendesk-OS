import { ReactNode } from 'react';

interface CardProps {
  variant?: 'default' | 'red' | 'amber' | 'purple' | 'green' | 'blue';
  className?: string;
  children: ReactNode;
}

const variantMap: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-white border border-pastel/80 shadow-sm',
  red: 'bg-red-50 border border-red-200 shadow-sm',
  amber: 'bg-amber-50 border border-amber-200 shadow-sm',
  purple: 'bg-green/5 border border-green/20 shadow-sm',
  green: 'bg-green-50 border border-green-200 shadow-sm',
  blue: 'bg-green/10 border border-green/20 shadow-sm',
};

export default function Card({ variant = 'default', className = '', children }: CardProps) {
  return (
    <div className={`rounded-xl p-5 ${variantMap[variant]} ${className}`}>
      {children}
    </div>
  );
}
