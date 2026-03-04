import { Macro, Ticket, MatchedMacro, MatchResult } from '@/types';

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function stripZendeskVariables(text: string): string {
  return text.replace(/\{\{[^}]+\}\}/g, '').replace(/\s+/g, ' ').trim();
}

export function generateTagFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function ticketHasMacroTag(ticket: Ticket, tag: string): boolean {
  return ticket.tags.includes(tag);
}

export function matchMacrosToTickets(
  macros: Macro[],
  tickets: Ticket[]
): MatchResult {
  const matched: MatchedMacro[] = [];
  const unmatched: Macro[] = [];

  for (const macro of macros) {
    const tag = macro.tag;
    if (!tag) {
      unmatched.push(macro);
      continue;
    }

    const matchedTickets = tickets.filter((t) => ticketHasMacroTag(t, tag));

    if (matchedTickets.length > 0) {
      matched.push({ macro, matchedTickets });
    } else {
      unmatched.push(macro);
    }
  }

  return { matched, unmatched };
}
