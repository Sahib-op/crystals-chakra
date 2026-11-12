import checkConfig from '../../../shared/generated/studio-config.js';
import checkSession from '../../../shared/generated/studio-session.js';
import checkPage from '../../../shared/generated/studio-reading-page.js';
import checkReading from '../../../shared/generated/studio-reading.js';
import checkPractitioners from '../../../shared/generated/studio-practitioners.js';
import checkHistory from '../../../shared/generated/studio-history.js';
import type {
  StudioConfiguration,
  StudioSession,
  StudioReadingPage,
  StudioReading,
  ReadingCreate,
  ReadingUpdate,
  Practitioners,
  AuditList,
} from '../../../shared/studio-contracts.ts';
const base = import.meta.env.VITE_API_URL || '';
export class StudioApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
async function request<T>(
  path: string,
  validate: (value: unknown) => boolean,
  token: string | null,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(base + '/api/' + path, {
    method: options.method ?? 'GET',
    cache: 'no-store',
    signal: options.signal ?? null,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new StudioApiError(
      response.status,
      'INVALID_RESPONSE',
      'The studio service is unavailable. Try again.',
    );
  }
  if (!response.ok) {
    const error = value as { code?: unknown; error?: unknown };
    throw new StudioApiError(
      response.status,
      typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error?.error === 'string' && error.error.length <= 240
        ? error.error
        : 'This request could not be completed.',
    );
  }
  if (!validate(value))
    throw new StudioApiError(
      503,
      'INVALID_RESPONSE',
      'The studio response could not be checked. Try again.',
    );
  return value as T;
}
export const studioApi = {
  config: (signal: AbortSignal) =>
    request<StudioConfiguration>('studio-config', checkConfig, null, {
      signal,
    }),
  session: (token: string, signal: AbortSignal) =>
    request<StudioSession>('studio/session', checkSession, token, { signal }),
  readings: (
    token: string,
    status: string,
    after: string,
    signal: AbortSignal,
  ) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (after) query.set('after', after);
    return request<StudioReadingPage>(
      'studio/readings?' + query,
      checkPage,
      token,
      { signal },
    );
  },
  practitioners: (token: string, signal: AbortSignal) =>
    request<Practitioners>('studio/practitioners', checkPractitioners, token, {
      signal,
    }),
  reading: (token: string, id: string, signal: AbortSignal) =>
    request<StudioReading>(
      'studio/readings/' + encodeURIComponent(id),
      checkReading,
      token,
      { signal },
    ),
  create: (token: string, input: ReadingCreate) =>
    request<StudioReading>('studio/readings', checkReading, token, {
      method: 'POST',
      body: input,
    }),
  update: (token: string, id: string, input: ReadingUpdate) =>
    request<StudioReading>(
      'studio/readings/' + encodeURIComponent(id),
      checkReading,
      token,
      { method: 'PATCH', body: input },
    ),
  history: (token: string, id: string, signal: AbortSignal) =>
    request<AuditList>(
      'studio/readings/' + encodeURIComponent(id) + '/history',
      checkHistory,
      token,
      { signal },
    ),
};
