import crypto from 'crypto';

const ALLOWED_DOMAIN = 'sidelineswap.com';
const COOKIE_NAME = 'zos_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!clientId || !clientSecret || !sessionSecret) {
    return res.redirect('/?error=config');
  }

  const redirectUri = `${process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.SITE_URL || 'http://localhost:5173'}/api/auth/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err);
      return res.redirect('/?error=token_exchange');
    }

    const tokens = await tokenRes.json();

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return res.redirect('/?error=userinfo');
    }

    const user = await userRes.json();

    // Verify domain
    if (!user.email || !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return res.redirect('/?error=unauthorized');
    }

    // Create signed session cookie
    const payload = JSON.stringify({
      email: user.email,
      name: user.name,
      picture: user.picture,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE,
    });

    const encoded = Buffer.from(payload).toString('base64url');
    const signature = crypto
      .createHmac('sha256', sessionSecret)
      .update(encoded)
      .digest('base64url');

    const token = `${encoded}.${signature}`;

    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${MAX_AGE}`);
    res.redirect('/');
  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect('/?error=server');
  }
}
