import { useEffect } from 'react';
import { useApp } from '@/components/macros/context/MacroAppContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface MatchingSummaryProps {
  onNext: () => void;
  onBack: () => void;
}

export default function MatchingSummary({ onNext, onBack }: MatchingSummaryProps) {
  const { matchResult, runMatching, tickets, selectedMacroIds } = useApp();

  useEffect(() => {
    runMatching();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!matchResult) {
    return <p className="text-slate-green text-sm">Running matching...</p>;
  }

  const totalMatched = matchResult.matched.reduce(
    (sum, m) => sum + m.matchedTickets.length,
    0
  );
  const hasMatches = matchResult.matched.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-turf/80">Match Results</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-green">
              {tickets.length} tickets · {selectedMacroIds.size} macros checked
            </span>
            <Button variant="ghost" size="sm" onClick={runMatching}>
              Re-run
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-green border-b border-pastel">
              <th className="pb-2 font-medium">Macro</th>
              <th className="pb-2 font-medium text-right">Matched Tickets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pastel">
            {matchResult.matched.map(({ macro, matchedTickets }) => (
              <tr key={macro.id}>
                <td className="py-2 text-turf">{macro.title}</td>
                <td className="py-2 text-right text-green font-medium">
                  {matchedTickets.length}
                </td>
              </tr>
            ))}
            {matchResult.unmatched.map((macro) => (
              <tr key={macro.id}>
                <td className="py-2 text-slate-green/70">{macro.title}</td>
                <td className="py-2 text-right text-slate-green/50">0</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 pt-3 border-t border-pastel text-xs text-slate-green">
          {matchResult.matched.length} macro{matchResult.matched.length !== 1 ? 's' : ''} matched
          across {totalMatched} ticket{totalMatched !== 1 ? 's' : ''}.
          {matchResult.unmatched.length > 0 && (
            <span className="ml-2 text-slate-green/70">
              {matchResult.unmatched.length} macro{matchResult.unmatched.length !== 1 ? 's' : ''}{' '}
              had no matches and will be excluded from analysis.
            </span>
          )}
        </div>
      </Card>

      {!hasMatches && (
        <Card variant="amber">
          <p className="text-amber-600 text-sm">
            No tickets matched any selected macros. Try uploading different tickets or selecting
            different macros.
          </p>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onNext} disabled={!hasMatches}>
          Analyze with AI →
        </Button>
      </div>
    </div>
  );
}
