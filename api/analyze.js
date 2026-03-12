import Anthropic from '@anthropic-ai/sdk';
import { verifyAuth } from './_auth.js';

export const config = { maxDuration: 60 };

// Cost controls
const MAX_TICKETS_PER_MACRO = 30;
const MAX_COMMENT_CHARS = 300;
const SKIP_BOT_COMMENTS = true;

function createClient(userApiKey) {
  const key = userApiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('No API key available. Set ANTHROPIC_API_KEY or add one in Settings.');
  return new Anthropic({ apiKey: key });
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripZendeskVariables(text) {
  return text.replace(/\{\{[^}]+\}\}/g, '').replace(/\s+/g, ' ').trim();
}

function getCustomField(ticket, fieldId) {
  const field = ticket.custom_fields?.find((f) => f.id === fieldId);
  return field?.value || '';
}

function channelLabel(channel) {
  if (channel === 'web') return 'Agent';
  if (channel === 'email') return 'Customer';
  if (channel === 'api') return 'Bot';
  return 'Unknown';
}

function buildPrompt(body) {
  const strippedBody = stripZendeskVariables(stripHtml(body.macroBody));

  const ticketsToAnalyze = [...body.tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, MAX_TICKETS_PER_MACRO);

  const ticketBlocks = ticketsToAnalyze
    .map((ticket) => {
      const username = getCustomField(ticket, 360005551059);
      const firstName = getCustomField(ticket, 360005472800);
      const swapId = getCustomField(ticket, 360005472960);

      const comments = ticket.comments
        .filter((c) => !SKIP_BOT_COMMENTS || c.via?.channel !== 'api')
        .map((c) => {
          const label = channelLabel(c.via?.channel);
          const text = (c.plain_body || '').slice(0, MAX_COMMENT_CHARS);
          return `[${label}] ${text}`;
        })
        .join('\n\n');

      return `--- Ticket #${ticket.id} ---
Subject: ${ticket.subject}
Username: ${username || 'N/A'}
Email: ${ticket.requester?.email || 'N/A'}
Swap ID: ${swapId || 'N/A'}
First Name: ${firstName || 'N/A'}
Tags: ${(ticket.tags || []).join(', ') || 'none'}
Status: ${ticket.status}
Created: ${ticket.created_at}

Comments:
${comments || '[no comments]'}`;
    })
    .join('\n\n');

  const cappedNote = body.tickets.length > MAX_TICKETS_PER_MACRO
    ? ` (showing ${MAX_TICKETS_PER_MACRO} most recent of ${body.tickets.length} total)`
    : '';

  return `You are analyzing Zendesk support tickets for the macro "${body.macroTitle}".
The macro body is:
${strippedBody}

Here are ${ticketsToAnalyze.length} tickets where this macro was used${cappedNote}:

${ticketBlocks}

Analyze these tickets and respond with ONLY valid JSON (no markdown, no code fences):
{
  "reasons": [
    {"label": "Short descriptive label for why the macro was used", "count": 3, "ticket_ids": [12345, 67890]}
  ],
  "action_items": [
    {"description": "What needs follow-up", "ticket_id": 12345, "username": "...", "email": "...", "swap_id": "...", "urgency": "high|medium|low"}
  ],
  "needs_context": [
    {"ticket_id": 12345, "reason": "Why more context is needed", "username": "...", "email": "...", "swap_id": "..."}
  ],
  "trend_note": "1-2 sentence insight about what's driving increased usage of this macro"
}

Rules:
- Group tickets by the actual REASON the customer needed help, not by the macro text
- Be specific in reason labels (e.g. "Seel return window expired, can't initiate return" not just "return issue")
- Flag action_items for anything unresolved, needing follow-up, or where something went wrong
- Flag needs_context for tickets where you can't determine the reason from the ticket alone (e.g., account restrictions). Include username/email so the reviewer can check the admin system
- Be concise but specific
- Respond with ONLY the JSON object, no other text`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Sign in with your @sidelineswap.com Google account.' });
  }

  try {
    const userKey = req.headers['x-api-key'];
    const body = req.body;

    if (!body.macroTitle || !body.tickets || body.tickets.length === 0) {
      return res.status(400).json({ error: 'macroTitle and a non-empty tickets array are required.' });
    }

    let client;
    try {
      client = createClient(userKey);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const prompt = buildPrompt(body);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonText = rawText
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return res.status(500).json({ error: `Claude returned non-JSON response: ${rawText.slice(0, 200)}` });
    }

    return res.status(200).json({ ...parsed, macroTitle: body.macroTitle });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
