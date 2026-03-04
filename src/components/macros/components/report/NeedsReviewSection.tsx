import { AnalysisResult } from '@/types';
import Card from '@/components/ui/Card';
import AdminLinks from '@/components/ui/AdminLinks';

interface NeedsReviewSectionProps {
  results: AnalysisResult[];
}

export default function NeedsReviewSection({ results }: NeedsReviewSectionProps) {
  const allItems = results.flatMap((r) =>
    r.needs_context.map((n) => ({ ...n, macroTitle: r.macroTitle }))
  );

  if (allItems.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-amber-600 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        Needs Manual Review ({allItems.length})
      </h2>
      <div className="space-y-3">
        {allItems.map((item, i) => (
          <Card key={i} variant="amber">
            <div className="mb-1">
              <span className="text-xs text-amber-600 uppercase tracking-wide font-medium">
                {item.macroTitle}
              </span>
            </div>
            <p className="text-turf text-sm">{item.reason}</p>
            {(item.username || item.email) && (
              <p className="text-xs text-amber-500 mt-1">
                {item.username && <span>@{item.username} </span>}
                {item.email && <span>{item.email}</span>}
              </p>
            )}
            <AdminLinks
              username={item.username}
              email={item.email}
              swapId={item.swap_id}
              ticketId={item.ticket_id}
            />
          </Card>
        ))}
      </div>
    </section>
  );
}
