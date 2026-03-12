import crypto from 'crypto';

const COOKIE_NAME = 'zos_session';
const ALLOWED_DOMAIN = 'sidelineswap.com';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name] = rest.join('=');
  });
  return cookies;
}

/**
 * Verify the session cookie. Returns user object or null.
 */
export function verifySession(req) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) return null;

  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  // Verify signature
  const expected = crypto
    .createHmac('sha256', sessionSecret)
    .update(encoded)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Check domain
    if (!payload.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return null;
    }

    return { email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

// Backwards-compatible export name
export const verifyAuth = verifySession;
