import { AnalysisResult } from '@/types';

const ZENDESK_URL = 'https://sidelineswap.zendesk.com/agent/tickets';
const ADMIN_URL = 'https://admin.sidelineswap.com/admin';

function urgencyRank(u: 'high' | 'medium' | 'low'): number {
  return u === 'high' ? 0 : u === 'medium' ? 1 : 2;
}

function line(char = '-', len = 60) {
  return char.repeat(len);
}

export function generatePlainTextReport(
  results: AnalysisResult[],
  editedTrendNotes: Record<string, string>
): string {
  const now = new Date().toLocaleString();
  const totalTickets = new Set(
    results.flatMap((r) => [
      ...r.reasons.flatMap((reason) => reason.ticket_ids),
      ...r.action_items.map((a) => a.ticket_id),
      ...r.needs_context.map((n) => n.ticket_id),
    ])
  ).size;

  const allActionItems = results.flatMap((r) =>
    r.action_items.map((a) => ({ ...a, macroTitle: r.macroTitle }))
  );
  const allNeedsContext = results.flatMap((r) =>
    r.needs_context.map((n) => ({ ...n, macroTitle: r.macroTitle }))
  );

  const sections: string[] = [];

  sections.push(
    `MACRO REVIEW REPORT`,
    `Generated: ${now}`,
    line('='),
    '',
    `SUMMARY`,
    line('-'),
    `Total Tickets Reviewed: ${totalTickets}`,
    `Macros Reviewed:        ${results.length}`,
    `Action Items:           ${allActionItems.length}`,
    `Needs Manual Review:    ${allNeedsContext.length}`,
    ''
  );

  if (allActionItems.length > 0) {
    sections.push(line('='), '', 'ACTION ITEMS', line('-'), '');
    const sorted = [...allActionItems].sort(
      (a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency)
    );
    sorted.forEach((item, i) => {
      sections.push(
        `${i + 1}. [${item.urgency.toUpperCase()}] ${item.description}`,
        `   Macro: ${item.macroTitle}`,
        `   Ticket: ${ZENDESK_URL}/${item.ticket_id}`
      );
      if (item.username) sections.push(`   User Admin: ${ADMIN_URL}/users/${item.username}`);
      if (item.swap_id) sections.push(`   Swap Admin: ${ADMIN_URL}/swaps/${item.swap_id}`);
      sections.push('');
    });
  }

  if (allNeedsContext.length > 0) {
    sections.push(line('='), '', 'NEEDS MANUAL REVIEW', line('-'), '');
    allNeedsContext.forEach((item, i) => {
      sections.push(
        `${i + 1}. ${item.reason}`,
        `   Macro: ${item.macroTitle}`,
        `   Ticket: ${ZENDESK_URL}/${item.ticket_id}`
      );
      if (item.username) sections.push(`   Username: ${item.username}`);
      if (item.email) sections.push(`   Email: ${item.email}`);
      if (item.username) sections.push(`   User Admin: ${ADMIN_URL}/users/${item.username}`);
      if (item.swap_id) sections.push(`   Swap Admin: ${ADMIN_URL}/swaps/${item.swap_id}`);
      sections.push('');
    });
  }

  sections.push(line('='), '', 'MACRO BREAKDOWN', '');
  for (const result of results) {
    const trendNote = editedTrendNotes[result.macroTitle] ?? result.trend_note;
    const totalCount = result.reasons.reduce((sum, r) => sum + r.count, 0);

    sections.push(
      line('-'),
      `${result.macroTitle} (${totalCount} tickets)`,
      line('-'),
      '',
      `Trend Note: ${trendNote}`,
      ''
    );

    if (result.reasons.length > 0) {
      sections.push('Reasons:');
      result.reasons.forEach((reason) => {
        const ticketLinks = reason.ticket_ids.map((id) => `#${id}`).join(', ');
        sections.push(`  - ${reason.label} (${reason.count}): ${ticketLinks}`);
      });
      sections.push('');
    }
  }

  return sections.join('\n');
}
