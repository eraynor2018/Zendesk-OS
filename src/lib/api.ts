/**
 * Wrapper around fetch. Cookies are sent automatically (same-origin).
 * Kept as a wrapper for consistency and future extensibility.
 */
export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: 'same-origin' });
}
