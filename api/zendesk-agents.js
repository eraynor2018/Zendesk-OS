export const config = {
  maxDuration: 60,
};

const BASE_URL = 'https://sidelineswap.zendesk.com';

function getAuthHeaders() {
  const email = process.env.ZENDESK_API_EMAIL;
  const token = process.env.ZENDESK_API_TOKEN;
  const auth = Buffer.from(`${email}/token:${token}`).toString('base64');
  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

async function fetchWithRetry(url, headers, maxRetries = 3, maxDelay = 10) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = Math.min(parseInt(res.headers.get('Retry-After') || '2', 10), maxDelay);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    return res;
  }
}

/**
 * Fetch user info (name + role) for a list of user IDs.
 * Returns { [id]: { name, role } }.
 */
async function fetchUserInfo(userIds) {
  if (userIds.length === 0) return {};
  const headers = getAuthHeaders();
  const usersMap = {};

  const batchSize = 100;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const url = `${BASE_URL}/api/v2/users/show_many.json?ids=${batch.join(',')}`;
    const res = await fetchWithRetry(url, headers);
    if (res.ok) {
      const data = await res.json();
      for (const user of data.users || []) {
        usersMap[user.id] = { name: user.name, role: user.role };
      }
    }
  }

  return usersMap;
}

/**
 * Fetch the audit trail for a single ticket and find who solved it.
 * Returns the author_id of the last status->solved event, or null.
 */
async function fetchTicketSolver(ticketId, headers) {
  let url = `${BASE_URL}/api/v2/tickets/${ticketId}/audits.json?per_page=100`;
  let solver = null;
  let pages = 0;

  while (url && pages < 3) {
    pages++;
    const res = await fetchWithRetry(url, headers, 2, 2);
    if (!res || !res.ok) break;
    const data = await res.json();

    for (const audit of data.audits || []) {
      for (const event of audit.events || []) {
        if (event.field_name === 'status' && event.value === 'solved') {
          solver = audit.author_id;
        }
      }
    }

    if (solver) break;
    url = data.next_page || null;
  }

  return solver;
}

/**
 * Resolve actual solvers for a list of tickets using per-ticket audits.
 * Budget is generous since each call only handles a batch (~150 tickets).
 */
async function fetchAllTicketSolvers(ticketIds) {
  const headers = getAuthHeaders();
  const solvers = {};
  const deadline = Date.now() + 50000; // 50-second budget per batch
  const CONCURRENCY = 8;

  for (let i = 0; i < ticketIds.length; i += CONCURRENCY) {
    if (Date.now() > deadline) {
      console.warn(
        `Solver audit timed out: resolved ${Object.keys(solvers).length}/${ticketIds.length} tickets`
      );
      break;
    }

    const batch = ticketIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (ticketId) => {
        const solver = await fetchTicketSolver(ticketId, headers);
        return { ticketId, solver };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.solver) {
        solvers[r.value.ticketId] = r.value.solver;
      }
    }
  }

  return solvers;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, weekStart, weekEnd, ticketIds: ticketIdsParam } = req.query;

  if (!process.env.ZENDESK_API_EMAIL || !process.env.ZENDESK_API_TOKEN) {
    return res.status(500).json({ error: 'Zendesk credentials not configured' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // ── MODE: SEARCH ────────────────────────────────────────────────────
  // Fast phase: search for solved tickets, filter Answer Bot, return
  // ticket list + user info for all assignees. (~10s)
  if (mode === 'search') {
    if (!weekStart || !weekEnd || !dateRegex.test(weekStart) || !dateRegex.test(weekEnd)) {
      return res.status(400).json({ error: 'weekStart and weekEnd required in YYYY-MM-DD format' });
    }

    try {
      const headers = getAuthHeaders();
      const query = `type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support"`;
      let allResults = [];
      let url = `${BASE_URL}/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=100`;

      while (url) {
        const r = await fetchWithRetry(url, headers);
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          throw new Error(`Zendesk search API error ${r.status}: ${text}`);
        }
        const data = await r.json();
        allResults.push(...(data.results || []));
        url = data.next_page || null;
      }

      // Filter out Answer Bot tickets
      const filtered = allResults.filter((ticket) => {
        const channel = ticket.via?.channel;
        const source = ticket.via?.source?.from?.title || '';
        return !(channel === 'api' && source.toLowerCase().includes('answer bot'));
      });

      // Collect assignee IDs and fetch user info
      const assigneeIds = new Set();
      for (const ticket of filtered) {
        if (ticket.assignee_id) assigneeIds.add(ticket.assignee_id);
      }
      const users = await fetchUserInfo([...assigneeIds]);

      // Return minimal ticket data + user info
      const tickets = filtered.map((t) => ({ id: t.id, assignee_id: t.assignee_id }));

      console.log(`Search complete: ${tickets.length} tickets, ${Object.keys(users).length} users`);
      return res.status(200).json({ tickets, users });
    } catch (err) {
      console.error('Zendesk search error:', err);
      return res.status(502).json({ error: 'Failed to search tickets', details: err.message });
    }
  }

  // ── MODE: AUDIT ─────────────────────────────────────────────────────
  // Slow phase: audit a batch of ticket IDs to find who solved each one.
  // Called multiple times in parallel with ~150 tickets each. (~15-25s)
  if (mode === 'audit') {
    if (!ticketIdsParam) {
      return res.status(400).json({ error: 'ticketIds parameter required' });
    }

    const ids = ticketIdsParam.split(',').map(Number).filter(Boolean);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No valid ticket IDs provided' });
    }

    try {
      const solvers = await fetchAllTicketSolvers(ids);

      // Fetch user info for any solver IDs discovered via audits
      const solverUserIds = [...new Set(Object.values(solvers))];
      const users = solverUserIds.length > 0 ? await fetchUserInfo(solverUserIds) : {};

      const resolvedCount = Object.keys(solvers).length;
      console.log(`Audit batch complete: ${resolvedCount}/${ids.length} tickets resolved`);

      return res.status(200).json({ solvers, users });
    } catch (err) {
      console.error('Zendesk audit error:', err);
      return res.status(502).json({ error: 'Failed to audit tickets', details: err.message });
    }
  }

  return res.status(400).json({
    error: 'mode parameter required: "search" or "audit"',
  });
}
