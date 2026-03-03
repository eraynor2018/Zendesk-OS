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
 * Get exact solved count by paginating search results and filtering out Answer Bot.
 * The count endpoint is approximate; this gives the real number.
 */
async function fetchExactSolvedCount(weekStart, weekEnd) {
  const headers = getAuthHeaders();
  const query = `type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support"`;
  let url = `${BASE_URL}/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=100`;
  let total = 0;

  while (url) {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zendesk search API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    for (const ticket of data.results || []) {
      const channel = ticket.via?.channel;
      const source = ticket.via?.source?.from?.title || '';
      if (!(channel === 'api' && source.toLowerCase().includes('answer bot'))) {
        total++;
      }
    }
    url = data.next_page || null;
  }

  return total;
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

  // Full report mode (counts, macros, CSAT — agent data served by /api/zendesk-agents)
  if (!weekStart || !weekEnd) {
    return res.status(400).json({ error: 'weekStart and weekEnd are required' });
  }

  if (!dateRegex.test(weekStart) || !dateRegex.test(weekEnd)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  try {
    const supportGroupId = await fetchSupportGroupId();

    const createdQuery = `type:ticket created>=${weekStart} created<=${weekEnd} group:"support"`;

    // Build parallel requests: created count + exact solved count + macro counts + optional CSAT
    const promises = [
      fetchCount(createdQuery),
      fetchExactSolvedCount(weekStart, weekEnd),
      ...MACRO_TAGS.map((tag) =>
        fetchCount(`type:ticket solved>=${weekStart} solved<=${weekEnd} group:"support" tags:${tag}`)
      ),
    ];

    const hasCsat = csatStart && csatEnd && dateRegex.test(csatStart) && dateRegex.test(csatEnd);
    if (hasCsat) {
      promises.push(fetchCsatData(csatStart, csatEnd, supportGroupId));
    }

    const results = await Promise.all(promises);

    const createdTickets = results[0];
    const solvedTickets = results[1];
    const macroCounts = results.slice(2, 2 + MACRO_TAGS.length);
    const csat = hasCsat ? results[2 + MACRO_TAGS.length] : null;

    const macros = {};
    MACRO_TAGS.forEach((tag, i) => {
      macros[tag] = macroCounts[i];
    });

    return res.status(200).json({
      createdTickets,
      solvedTickets,
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
