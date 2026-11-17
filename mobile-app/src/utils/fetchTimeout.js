// Give every request to the Vendora server a time limit.
// Without one, a request on a weak mobile connection can hang for minutes with a spinner showing.
// When the limit is reached the request fails with "Network request failed (timed out)", which the
// screens already turn into "We could not reach the server. Check your internet connection…".
import { API_BASE_URL } from '../config';

const READ_MS = 30 * 1000; // loading lists, details, payment status
const WRITE_MS = 90 * 1000; // sending forms and photos (slow on 3G)

export function installFetchTimeout() {
  const original = global.fetch;
  if (!original || original.__vendoraTimeout) return;

  const wrapped = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    // Only our own server, and only when the caller hasn't set up its own cancel signal
    if (!url.startsWith(API_BASE_URL) || init.signal) return original(input, init);

    const method = (init.method || 'GET').toUpperCase();
    const ms = method === 'GET' || method === 'HEAD' ? READ_MS : WRITE_MS;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);

    return original(input, { ...init, signal: controller.signal })
      .catch((err) => {
        if (timedOut) throw new Error('Network request failed (timed out)');
        throw err;
      })
      .finally(() => clearTimeout(timer));
  };
  wrapped.__vendoraTimeout = true;
  global.fetch = wrapped;
}
