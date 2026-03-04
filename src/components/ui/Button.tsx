import { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const variantMap = {
  primary: 'bg-green hover:bg-green/90 text-white shadow-sm disabled:bg-green/60 disabled:shadow-none',
  secondary: 'bg-white border border-pastel/80 hover:bg-pastel/20 text-turf shadow-sm disabled:opacity-50 disabled:shadow-none',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:bg-red-400',
  ghost: 'text-slate-green hover:text-turf hover:bg-pastel/30 disabled:opacity-50',
};

const sizeMap = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
}
