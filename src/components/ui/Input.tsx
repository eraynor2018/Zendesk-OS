import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mono?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, mono = false, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-turf/80 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-white border ${
            error ? 'border-red-500' : 'border-pastel/80'
          } rounded-lg px-3 py-2 text-sm text-turf placeholder-slate-green/40 shadow-sm focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20 transition-colors ${
            mono ? 'font-mono text-sm' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
