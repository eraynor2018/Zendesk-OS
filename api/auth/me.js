import { verifySession } from '../_auth.js';

export default function handler(req, res) {
  const user = verifySession(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.status(200).json(user);
}
