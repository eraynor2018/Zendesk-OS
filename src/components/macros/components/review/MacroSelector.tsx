import { useState } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { stripHtml } from '@/lib/matching';

interface MacroSelectorProps {
  onNext: () => void;
  onBack: () => void;
}

export default function MacroSelector({ onNext, onBack }: MacroSelectorProps) {
  const { macros, selectedMacroIds, toggleMacroSelection, selectAllMacros, clearMacroSelection } =
    useApp();
  const [search, setSearch] = useState('');

  const filtered = search
    ? macros.filter(
        (m) =>
          m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.body.toLowerCase().includes(search.toLowerCase())
      )
    : macros;

  if (macros.length === 0) {
    return (
      <Card variant="amber">
        <p className="text-amber-600 text-sm">
          No macros in library. Go to the <strong>Macro Library</strong> tab first.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-green">
          {selectedMacroIds.size} of {macros.length} selected
        </span>
        <div className="flex gap-2">
          <button onClick={selectAllMacros} className="text-xs text-green hover:text-green/80 font-medium transition-colors">
            Select all
          </button>
          <span className="text-pastel">·</span>
          <button onClick={clearMacroSelection} className="text-xs text-slate-green hover:text-turf font-medium transition-colors">
            Clear
          </button>
        </div>
      </div>

      <Input
        placeholder="Search macros..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="max-h-96 overflow-y-auto bg-white border border-pastel/80 rounded-xl shadow-sm">
        {filtered.map((macro, i) => {
          const isSelected = selectedMacroIds.has(macro.id);
          return (
            <label
              key={macro.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                i > 0 ? 'border-t border-pastel/50' : ''
              } ${isSelected ? 'bg-green/[0.03]' : 'hover:bg-pastel/10'}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleMacroSelection(macro.id)}
                className="accent-green flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-turf truncate">{macro.title}</p>
                <p className="text-xs text-slate-green/50 truncate mt-0.5 font-mono">
                  {stripHtml(macro.body).slice(0, 80)}
                </p>
              </div>
            </label>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-green/70 text-center py-6">
            No macros match your search.
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onNext} disabled={selectedMacroIds.size === 0}>
          Match Tickets →
        </Button>
      </div>
    </div>
  );
}
