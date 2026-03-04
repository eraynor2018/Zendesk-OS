import { ReactNode } from 'react';

interface CardProps {
  variant?: 'default' | 'red' | 'amber' | 'purple' | 'green' | 'blue';
  className?: string;
  children: ReactNode;
}

const variantMap: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-white border border-pastel',
  red: 'bg-red-50 border border-red-200',
  amber: 'bg-amber-50 border border-amber-200',
  purple: 'bg-green/5 border border-green/20',
  green: 'bg-green-50 border border-green-200',
  blue: 'bg-green/10 border border-green/20',
};

export default function Card({ variant = 'default', className = '', children }: CardProps) {
  return (
    <div className={`rounded-lg p-4 ${variantMap[variant]} ${className}`}>
      {children}
    </div>
  );
}
