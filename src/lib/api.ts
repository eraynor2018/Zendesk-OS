import { supabase } from './supabase';

/**
 * Wrapper around fetch that attaches the Supabase access token.
 */
export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  }

  return fetch(input, { ...init, headers });
}
