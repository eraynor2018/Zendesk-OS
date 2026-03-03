export const config = {
  maxDuration: 60,
};

const BASE_URL = 'https://sidelineswap.zendesk.com';

const MACRO_TAGS = [
  'how_to', 'swap_updates', 'delinquent_account', 'transactional',
  'revised_label', 'shipping', 'dispute', '2fa', 'account_updates',
  'fraud', 'bug', 'cashout', 'tariffs', 'account_access', 'w9',
];

function getAuthHeaders() {
  const email = process.env.ZENDESK_API_EMAIL;
  const token = process.env.ZENDESK_API_TOKEN;
  const auth = Buffer.from(`${email}/token:${token}`).toString('base64');
  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

async function fetchWithRetry(url, headers, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    return res;
  }
}

async function fetchCount(query) {
  const url = `${BASE_URL}/api/v2/search/count.json?query=${encodeURIComponent(query)}`;
  const res = await fetchWithRetry(url, getAuthHeaders());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Zendesk count API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.count;
}

async function fetchUserNames(userIds) {
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
        usersMap[user.id] = user.name;
      }
    }
  }

  return usersMap;
}

async function fetchSupportGroupId() {
  const url = `${BASE_URL}/api/v2/groups.json`;
  const res = await fetchWithRetry(url, getAuthHeaders());
  if (!res.ok) return null;
  const data = await res.json();
  const supportGroup = (data.groups || []).find(
    (g) => g.name.toLowerCase() === 'support'
  );
  return supportGroup ? supportGroup.id : null;
}

/**
 * Uses the Incremental Ticket Events API to find who actually changed
 * each ticket's status to "solved". Returns { [ticketId]: updaterId }
 * or null if the API is unavailable.
 *
 * This fixes the discrepancy where our tool counted by assignee_id
 * (who the ticket is assigned to) but Zendesk Analytics counts by
 * who performed the solve action (e.g. an agent may solve a ticket
 * assigned to another agent without reassigning it first).
 */
async function fetchTicketSolvers(weekStart, weekEnd, ticketIdSet) {
  const headers = getAuthHeaders();
  const startTime = Math.floor(new Date(weekStart + 'T00:00:00Z').getTime() / 1000);
  const endTime = Math.floor(new Date(weekEnd + 'T23:59:59Z').getTime() / 1000);
  const deadline = Date.now() + 40000; // 40-second time budget

  const solvers = {}; // ticketId -> updater who solved it (last solve wins)
  let url = `${BASE_URL}/api/v2/incremental/ticket_events.json?start_time=${startTime}`;

  while (url) {
    // Check time budget — return what we have if running low
    if (Date.now() > deadline) {
      console.warn('Solver resolution time budget exceeded, returning partial data');
      break;
    }

    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      // If this endpoint isn't available on this plan, return null to fall back
      if (res.status === 403 || res.status === 404) return null;
      const text = await res.text().catch(() => '');
      throw new Error(`Zendesk ticket events API error ${res.status}: ${text}`);
    }
    const data = await res.json();

    for (const event of data.ticket_events || []) {
      // Skip events past our end window
      if (event.timestamp > endTime) continue;
      // Only process tickets in our set
      if (!ticketIdSet.has(event.ticket_id)) continue;

      for (const child of event.child_events || []) {
        if (child.field_name === 'status' && child.value === 'solved') {
          solvers[event.ticket_id] = event.updater_id;
          break;
        }
      }
    }

    // Stop if past our date range or end of data
    if (data.end_of_stream) break;
    if (data.end_time && data.end_time > endTime) break;
    url = data.next_page || null;
  }

  return solvers;
}

async function fetchAgentSolves(weekStart, weekEnd) {
  const headers = getAuthHeaders();
  const query = `type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support"`;
  let allResults = [];
  let url = `${BASE_URL}/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=100`;

  while (url) {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zendesk search API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    allResults.push(...(data.results || []));
    url = data.next_page || null;
  }

  // Filter out Answer Bot tickets
  const filtered = allResults.filter((ticket) => {
    const channel = ticket.via?.channel;
    const source = ticket.via?.source?.from?.title || '';
    return !(channel === 'api' && source.toLowerCase().includes('answer bot'));
  });

  // Build ticket ID set for solver lookup
  const ticketIdSet = new Set(filtered.map((t) => t.id));

  // Try to get actual solvers via incremental ticket events
  let solvers = null;
  try {
    solvers = await fetchTicketSolvers(weekStart, weekEnd, ticketIdSet);
  } catch (e) {
    console.warn('Could not fetch ticket solvers, falling back to assignee:', e.message);
  }

  // Count by actual solver (or assignee as fallback for unresolved tickets)
  const agentIdCounts = {};
  for (const ticket of filtered) {
    const solverId = (solvers && solvers[ticket.id]) || ticket.assignee_id;
    if (solverId) {
      agentIdCounts[solverId] = (agentIdCounts[solverId] || 0) + 1;
    }
  }

  // Resolve IDs to names
  const uniqueIds = Object.keys(agentIdCounts).map(Number);
  const usersMap = await fetchUserNames(uniqueIds);

  const agents = Object.entries(agentIdCounts)
    .map(([id, solved]) => ({
      name: usersMap[Number(id)] || `Agent ${id}`,
      solved,
    }))
    .sort((a, b) => b.solved - a.solved);

  const solvedTickets = agents.reduce((sum, a) => sum + a.solved, 0);

  return { agents, solvedTickets };
}

async function fetchCsatData(csatStart, csatEnd, supportGroupId) {
  const startDate = new Date(csatStart + 'T00:00:00Z');
  const endDate = new Date(csatEnd + 'T00:00:00Z');
  // Add 24h to end date to include the full last day
  endDate.setDate(endDate.getDate() + 1);

  const startTime = Math.floor(startDate.getTime() / 1000);
  const endTime = Math.floor(endDate.getTime() / 1000);

  const headers = getAuthHeaders();
  let good = 0;
  let bad = 0;
  let url = `${BASE_URL}/api/v2/satisfaction_ratings?start_time=${startTime}&end_time=${endTime}&per_page=100`;

  while (url) {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zendesk CSAT API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    for (const rating of data.satisfaction_ratings || []) {
      // Only count ratings for the support group
      if (supportGroupId && rating.group_id !== supportGroupId) continue;

      if (rating.score === 'good') good++;
      else if (rating.score === 'bad') bad++;
    }
    url = data.next_page || null;
  }

  const total = good + bad;
  const score = total > 0 ? ((good / total) * 100).toFixed(1) : '0.0';
  return { score, good, bad };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { weekStart, weekEnd, csatStart, csatEnd, csatOnly } = req.query;

  if (!process.env.ZENDESK_API_EMAIL || !process.env.ZENDESK_API_TOKEN) {
    return res.status(500).json({ error: 'Zendesk credentials not configured' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // CSAT-only mode: quick fetch of just CSAT data
  if (csatOnly === 'true') {
    if (!csatStart || !csatEnd || !dateRegex.test(csatStart) || !dateRegex.test(csatEnd)) {
      return res.status(400).json({ error: 'csatStart and csatEnd are required in YYYY-MM-DD format' });
    }
    try {
      const supportGroupId = await fetchSupportGroupId();
      const csat = await fetchCsatData(csatStart, csatEnd, supportGroupId);
      return res.status(200).json({ csat });
    } catch (err) {
      console.error('Zendesk CSAT error:', err);
      return res.status(502).json({ error: 'Failed to fetch CSAT data', details: err.message });
    }
  }

  // Full report mode
  if (!weekStart || !weekEnd) {
    return res.status(400).json({ error: 'weekStart and weekEnd are required' });
  }

  if (!dateRegex.test(weekStart) || !dateRegex.test(weekEnd)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  try {
    // Fetch support group ID first (needed for CSAT group filtering)
    const supportGroupId = await fetchSupportGroupId();

    const createdQuery = `type:ticket created>=${weekStart} created<=${weekEnd} group:"support"`;

    // Build parallel requests: created count + macro counts + agent solves
    const promises = [
      fetchCount(createdQuery),
      ...MACRO_TAGS.map((tag) =>
        fetchCount(`type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support" tags:${tag}`)
      ),
      fetchAgentSolves(weekStart, weekEnd),
    ];

    // Add CSAT if dates provided
    const hasCsat = csatStart && csatEnd && dateRegex.test(csatStart) && dateRegex.test(csatEnd);
    if (hasCsat) {
      promises.push(fetchCsatData(csatStart, csatEnd, supportGroupId));
    }

    const results = await Promise.all(promises);

    const createdTickets = results[0];
    const macroCounts = results.slice(1, 1 + MACRO_TAGS.length);
    const agentData = results[1 + MACRO_TAGS.length];
    const csat = hasCsat ? results[1 + MACRO_TAGS.length + 1] : null;

    const macros = {};
    MACRO_TAGS.forEach((tag, i) => {
      macros[tag] = macroCounts[i];
    });

    return res.status(200).json({
      createdTickets,
      solvedTickets: agentData.solvedTickets,
      agents: agentData.agents,
      macros,
      csat,
    });
  } catch (err) {
    console.error('Zendesk report error:', err);
    return res.status(502).json({
      error: 'Failed to fetch data from Zendesk',
      details: err.message,
    });
  }
}
