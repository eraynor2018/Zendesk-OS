import { AnalysisResult } from '@/types';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import AdminLinks from '@/components/ui/AdminLinks';

interface ActionItemsSectionProps {
  results: AnalysisResult[];
}

function urgencyRank(u: string) {
  return u === 'high' ? 0 : u === 'medium' ? 1 : 2;
}

export default function ActionItemsSection({ results }: ActionItemsSectionProps) {
  const allItems = results.flatMap((r) =>
    r.action_items.map((a) => ({ ...a, macroTitle: r.macroTitle }))
  );

  if (allItems.length === 0) return null;

  const sorted = [...allItems].sort(
    (a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency)
  );

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        Action Items ({sorted.length})
      </h2>
      <div className="space-y-3">
        {sorted.map((item, i) => (
          <Card key={i} variant="red">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={item.urgency as 'high' | 'medium' | 'low'}>{item.urgency}</Badge>
              <span className="text-xs text-red-500 uppercase tracking-wide font-medium">
                {item.macroTitle}
              </span>
            </div>
            <p className="text-turf text-sm">{item.description}</p>
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
