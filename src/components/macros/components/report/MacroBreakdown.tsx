import { AnalysisResult } from '@/types';
import TrendNoteEditor from './TrendNoteEditor';

interface MacroBreakdownProps {
  result: AnalysisResult;
  editedTrendNote?: string;
  onUpdateTrendNote: (note: string) => void;
}

const ZENDESK_BASE = 'https://sidelineswap.zendesk.com/agent/tickets';

export default function MacroBreakdown({
  result,
  editedTrendNote,
  onUpdateTrendNote,
}: MacroBreakdownProps) {
  const totalTickets = result.reasons.reduce((sum, r) => sum + r.count, 0);
  const trendNote = editedTrendNote ?? result.trend_note;

  return (
    <div className="bg-white border border-pastel rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-turf font-semibold">{result.macroTitle}</h3>
        <span className="text-sm text-slate-green">
          {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
        </span>
      </div>

      <TrendNoteEditor
        macroTitle={result.macroTitle}
        value={trendNote}
        onSave={onUpdateTrendNote}
      />

      {result.reasons.length > 0 && (
        <div className="mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-green border-b border-pastel">
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 font-medium text-center w-16">Count</th>
                <th className="pb-2 font-medium">Tickets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pastel">
              {result.reasons.map((reason, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-turf pr-4">{reason.label}</td>
                  <td className="py-2.5 text-center text-green font-medium">{reason.count}</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {reason.ticket_ids.map((id) => (
                        <a
                          key={id}
                          href={`${ZENDESK_BASE}/${id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green hover:text-green/80 text-xs underline underline-offset-2"
                        >
                          #{id}
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
