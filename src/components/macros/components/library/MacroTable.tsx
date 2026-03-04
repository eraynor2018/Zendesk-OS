import { useState } from 'react';
import { Macro } from '@/types';
import { stripHtml } from '@/lib/matching';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface MacroTableProps {
  macros: Macro[];
  onDelete: (id: string) => void;
}

export default function MacroTable({ macros, onDelete }: MacroTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (macros.length === 0) {
    return (
      <Card>
        <p className="text-slate-green text-sm text-center py-4">
          No macros yet. Import a CSV or add one manually above.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {macros.map((macro) => (
        <Card key={macro.id} className="!py-3.5 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-turf font-medium text-sm truncate">{macro.title}</p>
            <p className="text-slate-green/60 text-xs mt-0.5 font-mono truncate">
              {stripHtml(macro.body).slice(0, 120)}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmId(macro.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
