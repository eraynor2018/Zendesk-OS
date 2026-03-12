const COOKIE_NAME = 'zos_session';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);
  res.redirect('/');
}
