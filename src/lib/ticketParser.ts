import { Ticket } from '@/types';

function isValidTicket(obj: unknown): obj is Ticket {
  if (typeof obj !== 'object' || obj === null) return false;
  const t = obj as Record<string, unknown>;
  return (
    (typeof t.id === 'number' || typeof t.id === 'string') &&
    typeof t.subject === 'string' &&
    Array.isArray(t.comments)
  );
}

function normalizeTicket(obj: Record<string, unknown>): Ticket {
  return {
    id: Number(obj.id),
    subject: String(obj.subject || ''),
    description: String(obj.description || ''),
    status: String(obj.status || ''),
    tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
    created_at: String(obj.created_at || ''),
    custom_fields: Array.isArray(obj.custom_fields)
      ? (obj.custom_fields as Array<{ id: number; value: string | null }>)
      : [],
    requester:
      typeof obj.requester === 'object' && obj.requester !== null
        ? {
            name: String((obj.requester as Record<string, unknown>).name || ''),
            email: String((obj.requester as Record<string, unknown>).email || ''),
          }
        : { name: '', email: '' },
    comments: Array.isArray(obj.comments)
      ? (obj.comments as Array<Record<string, unknown>>).map((c) => ({
          plain_body: String(c.plain_body || ''),
          body: String(c.body || ''),
          html_body: c.html_body ? String(c.html_body) : undefined,
          via:
            c.via && typeof c.via === 'object'
              ? { channel: String((c.via as Record<string, unknown>).channel || '') }
              : undefined,
          created_at: String(c.created_at || ''),
        }))
      : [],
  };
}

export async function parseTicketFile(file: File): Promise<Ticket[]> {
  const text = await file.text();
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  // Try NDJSON first
  if (lines.length > 0) {
    try {
      const parsed = lines.map((line) => JSON.parse(line));
      if (parsed.every(isValidTicket)) {
        return parsed.map((t) => normalizeTicket(t as unknown as Record<string, unknown>));
      }
    } catch {
      // Not NDJSON — fall through to JSON
    }
  }

  // Try standard JSON
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON or NDJSON.');
  }

  let tickets: unknown[];

  if (Array.isArray(data)) {
    tickets = data;
  } else if (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as Record<string, unknown>).tickets)
  ) {
    tickets = (data as Record<string, unknown>).tickets as unknown[];
  } else if (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as Record<string, unknown>).results)
  ) {
    tickets = (data as Record<string, unknown>).results as unknown[];
  } else {
    throw new Error(
      'Unrecognized file format. Expected a JSON array, NDJSON, or an object with a "tickets" or "results" array.'
    );
  }

  const valid = tickets.filter(isValidTicket);
  if (valid.length < tickets.length) {
    console.warn(`Skipped ${tickets.length - valid.length} malformed ticket(s).`);
  }

  return valid.map((t) => normalizeTicket(t as unknown as Record<string, unknown>));
}
