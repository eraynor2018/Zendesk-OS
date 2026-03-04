import { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-turf">{title}</h1>
          {description && (
            <p className="mt-1 text-slate-green text-sm">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
