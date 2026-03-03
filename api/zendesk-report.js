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

/**
 * Fetch user info (name + role) for a list of user IDs.
 * Returns { [id]: { name, role } }.
 * role is "end-user", "agent", or "admin".
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
 * Fetch the audit trail for a single ticket and find who solved it.
 * Returns the author_id of the last status→solved event, or null.
 * Audits are in chronological order; we keep the last solve author.
 */
async function fetchTicketSolver(ticketId, headers) {
  let url = `${BASE_URL}/api/v2/tickets/${ticketId}/audits.json?per_page=100`;
  let solver = null;
  let pages = 0;

  while (url && pages < 3) {
    pages++;
    const res = await fetchWithRetry(url, headers, 1);
    if (!res || !res.ok) break;
    const data = await res.json();

    for (const audit of data.audits || []) {
      for (const event of audit.events || []) {
        if (event.field_name === 'status' && event.value === 'solved') {
          solver = audit.author_id;
        }
      }
    }

    // Only paginate if we haven't found a solver yet (save API calls)
    if (solver) break;
    url = data.next_page || null;
  }

  return solver;
}

/**
 * Resolve actual solvers for a list of tickets using per-ticket audits.
 * Sends concurrent requests with a time budget so we process as many
 * as possible within the serverless function timeout.
 */
async function fetchAllTicketSolvers(ticketIds) {
  const headers = getAuthHeaders();
  const solvers = {};
  const deadline = Date.now() + 40000; // 40-second budget
  const CONCURRENCY = 10;

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

  // Collect assignee IDs upfront so we can fetch their info in parallel with audits
  const assigneeIds = new Set();
  for (const ticket of filtered) {
    if (ticket.assignee_id) assigneeIds.add(ticket.assignee_id);
  }

  // Run audit resolution AND assignee user info fetch in PARALLEL
  const ticketIds = filtered.map((t) => t.id);
  const [solvers, usersMap] = await Promise.all([
    fetchAllTicketSolvers(ticketIds).catch((e) => {
      console.warn('Could not fetch ticket solvers, falling back to assignee:', e.message);
      return {};
    }),
    fetchUserInfo([...assigneeIds]),
  ]);

  const resolvedCount = Object.keys(solvers).length;
  console.log(
    `Solver resolution: ${resolvedCount}/${ticketIds.length} tickets resolved via audits`
  );

  // Fetch info for any solver IDs that weren't assignees (small follow-up)
  const missingSolverIds = new Set();
  for (const ticket of filtered) {
    const solverId = solvers[ticket.id];
    if (solverId && !usersMap[solverId]) missingSolverIds.add(solverId);
  }
  if (missingSolverIds.size > 0) {
    const extraUsers = await fetchUserInfo([...missingSolverIds]);
    Object.assign(usersMap, extraUsers);
  }

  // Count by actual solver, using role to filter out non-agents.
  // If the audit solver is an end-user (customer), fall back to assignee.
  const agentIdCounts = {};
  for (const ticket of filtered) {
    let solverId = solvers[ticket.id] || ticket.assignee_id;

    // If solver is an end-user, fall back to the ticket assignee
    if (solverId && usersMap[solverId]?.role === 'end-user') {
      solverId = ticket.assignee_id;
    }

    // Only count if the final solver is NOT an end-user
    if (solverId && usersMap[solverId]?.role !== 'end-user') {
      agentIdCounts[solverId] = (agentIdCounts[solverId] || 0) + 1;
    }
  }

  const agents = Object.entries(agentIdCounts)
    .map(([id, solved]) => ({
      name: usersMap[Number(id)]?.name || `Agent ${id}`,
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
    // Fetch support group ID (needed for CSAT group filtering)
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
