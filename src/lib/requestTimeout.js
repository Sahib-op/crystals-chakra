export class RequestTimeoutError extends Error {
  constructor(message = 'This is taking longer than expected. Please try again.') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

/**
 * Bound the complete operation, including response-body reads. Keep caller
 * cancellation separate from a slow service so unmounted pages stay silent.
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} operation
 * @param {{signal?: AbortSignal, timeoutMs?: number, message?: string}} options
 * @returns {Promise<T>}
 */
export async function withRequestTimeout(operation, options = {}) {
  const { signal, timeoutMs = 12000, message } = options;
  if (signal?.aborted) throw signal.reason;
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new RequestTimeoutError(message)),
    timeoutMs,
  );
  let rejectOnAbort;
  const interrupted = new Promise((_, reject) => {
    rejectOnAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
  });
  try {
    return await Promise.race([operation(controller.signal), interrupted]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
    controller.signal.removeEventListener('abort', rejectOnAbort);
  }
}
