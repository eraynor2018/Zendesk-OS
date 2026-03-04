export interface Macro {
  id: string;
  title: string;
  body: string;
}

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: string;
  tags: string[];
  created_at: string;
  custom_fields: Array<{ id: number; value: string | null }>;
  requester: { name: string; email: string };
  comments: Array<{
    plain_body: string;
    body: string;
    html_body?: string;
    via?: { channel: string };
    created_at: string;
  }>;
}

export interface MatchedMacro {
  macro: Macro;
  matchedTickets: Ticket[];
}

export interface MatchResult {
  matched: MatchedMacro[];
  unmatched: Macro[];
}

export interface AnalysisResult {
  macroTitle: string;
  reasons: Array<{ label: string; count: number; ticket_ids: number[] }>;
  action_items: Array<{
    description: string;
    ticket_id: number;
    username: string;
    email: string;
    swap_id: string;
    urgency: 'high' | 'medium' | 'low';
  }>;
  needs_context: Array<{
    ticket_id: number;
    reason: string;
    username: string;
    email: string;
    swap_id: string;
  }>;
  trend_note: string;
}

export interface ReportState {
  results: AnalysisResult[];
  editedTrendNotes: Record<string, string>;
}
