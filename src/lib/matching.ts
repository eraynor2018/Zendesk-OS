import { Macro, Ticket, MatchedMacro, MatchResult } from '@/types';

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function stripZendeskVariables(text: string): string {
  return text.replace(/\{\{[^}]+\}\}/g, '').replace(/\s+/g, ' ').trim();
}

export function extractPhrases(text: string): string[] {
  const cleaned = stripZendeskVariables(stripHtml(text));
  const chunks = cleaned.split(/[.!?\n]+/);
  const phrases: string[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed.length > 20) {
      if (trimmed.length > 200) {
        const subChunks = trimmed.split(/[,;]+/);
        for (const sub of subChunks) {
          const s = sub.trim();
          if (s.length > 20) phrases.push(s);
        }
      } else {
        phrases.push(trimmed);
      }
    }
  }

  return [...new Set(phrases)];
}

export function ticketMatchesMacro(ticket: Ticket, phrases: string[]): boolean {
  for (const comment of ticket.comments) {
    const plainBody = (comment.plain_body || '').toLowerCase();
    const body = (comment.body || '').toLowerCase();
    for (const phrase of phrases) {
      const lowerPhrase = phrase.toLowerCase();
      if (plainBody.includes(lowerPhrase) || body.includes(lowerPhrase)) {
        return true;
      }
    }
  }
  return false;
}

export function matchMacrosToTickets(
  macros: Macro[],
  tickets: Ticket[]
): MatchResult {
  const matched: MatchedMacro[] = [];
  const unmatched: Macro[] = [];

  for (const macro of macros) {
    const phrases = extractPhrases(macro.body);
    const matchedTickets = phrases.length > 0
      ? tickets.filter((t) => ticketMatchesMacro(t, phrases))
      : [];

    if (matchedTickets.length > 0) {
      matched.push({ macro, matchedTickets });
    } else {
      unmatched.push(macro);
    }
  }

  return { matched, unmatched };
}
