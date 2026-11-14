import { withRequestTimeout } from './requestTimeout.js';

const API = import.meta.env?.VITE_API_URL || '';
export async function request(path, body, signal) {
  return withRequestTimeout(
    async (requestSignal) => {
      const response = await fetch(`${API}/api/${path}`, {
        signal: requestSignal,
        ...(body
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        if (requestSignal.aborted) throw requestSignal.reason;
        throw new Error('The service is unavailable. Please try again.');
      }
      if (!response.ok)
        throw new Error(
          data.error || 'Something went wrong. Please try again.',
        );
      return data;
    },
    {
      signal,
      timeoutMs: body ? 30000 : 12000,
      message: body
        ? 'Checkout is taking longer than expected. Your cart is still here. Please try again.'
        : 'This is taking longer than expected. Check your connection and try again.',
    },
  );
}
