const BASE_URL = 'https://sidelineswap.zendesk.com';

const MACRO_TAGS = [
  'how_to', 'swap_updates', 'delinquent_account', 'transactional',
  'shipping', 'shipping_issues', 'dispute', '2fa', 'account_updates',
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

function getLastFriday(fromDate) {
  const d = new Date(fromDate);
  const day = d.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function fetchWithRetry(url, headers, maxRetries = 2) {
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

async function fetchAgentSolves(weekStart, weekEnd) {
  const headers = getAuthHeaders();
  const query = `type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support" -via:"Answer Bot for Web Widget"`;
  let allResults = [];
  let usersMap = {};
  let url = `${BASE_URL}/api/v2/search.json?query=${encodeURIComponent(query)}&include=users&per_page=100`;

  while (url) {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zendesk search API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    allResults.push(...(data.results || []));

    if (data.users) {
      for (const user of data.users) {
        usersMap[user.id] = user.name;
      }
    }

    url = data.next_page || null;
  }

  const agentCounts = {};
  for (const ticket of allResults) {
    if (ticket.assignee_id) {
      const name = usersMap[ticket.assignee_id] || `Agent ${ticket.assignee_id}`;
      agentCounts[name] = (agentCounts[name] || 0) + 1;
    }
  }

  return Object.entries(agentCounts)
    .map(([name, solved]) => ({ name, solved }))
    .sort((a, b) => b.solved - a.solved);
}

async function fetchCsatData(weekEnd) {
  const lastFri = getLastFriday(new Date(weekEnd + 'T12:00:00'));
  const prevFri = new Date(lastFri);
  prevFri.setDate(prevFri.getDate() - 7);

  const startTime = Math.floor(prevFri.getTime() / 1000);
  const endTime = Math.floor(lastFri.getTime() / 1000);

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

  const { weekStart, weekEnd } = req.query;
  if (!weekStart || !weekEnd) {
    return res.status(400).json({ error: 'weekStart and weekEnd are required' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(weekStart) || !dateRegex.test(weekEnd)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  if (!process.env.ZENDESK_API_EMAIL || !process.env.ZENDESK_API_TOKEN) {
    return res.status(500).json({ error: 'Zendesk credentials not configured' });
  }

  try {
    const createdQuery = `type:ticket created>=${weekStart} created<=${weekEnd} group:"support" -via:"Answer Bot for Web Widget"`;
    const solvedQuery = `type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support" -via:"Answer Bot for Web Widget"`;

    const results = await Promise.all([
      fetchCount(createdQuery),
      fetchCount(solvedQuery),
      ...MACRO_TAGS.map((tag) =>
        fetchCount(`type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support" tags:${tag}`)
      ),
      fetchAgentSolves(weekStart, weekEnd),
      fetchCsatData(weekEnd),
    ]);

    const createdTickets = results[0];
    const solvedTickets = results[1];
    const macroCounts = results.slice(2, 2 + MACRO_TAGS.length);
    const agents = results[2 + MACRO_TAGS.length];
    const csat = results[2 + MACRO_TAGS.length + 1];

    const macros = {};
    MACRO_TAGS.forEach((tag, i) => {
      macros[tag] = macroCounts[i];
    });

    return res.status(200).json({
      createdTickets,
      solvedTickets,
      agents,
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
