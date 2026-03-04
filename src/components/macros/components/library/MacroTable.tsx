import { useState } from 'react';
import { Macro } from '@/types';
import Button from '@/components/ui/Button';

interface MacroTableProps {
  macros: Macro[];
  onDelete: (id: string) => void;
}

export default function MacroTable({ macros, onDelete }: MacroTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (macros.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-green text-sm">
          No macros yet. Import a CSV or add one manually above.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-pastel/80 rounded-xl shadow-sm overflow-hidden">
      {macros.map((macro, i) => (
        <div
          key={macro.id}
          className={`flex items-center justify-between gap-4 px-4 py-3 ${
            i > 0 ? 'border-t border-pastel/50' : ''
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-turf font-medium text-sm truncate">{macro.title}</p>
            <p className="text-slate-green/50 text-xs mt-0.5 font-mono truncate">
              tag: {macro.tag || 'none'}
            </p>
          </div>
          <div className="flex-shrink-0">
            {confirmId === macro.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-green">Delete?</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { onDelete(macro.id); setConfirmId(null); }}
                >
                  Yes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                  No
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(macro.id)}
                className="text-xs text-slate-green/40 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
