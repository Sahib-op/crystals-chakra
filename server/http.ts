import type { IncomingMessage } from 'node:http';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(
    status: number,
    message: string,
    code = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function decodeJsonBody(bytes: Uint8Array): Record<string, unknown> {
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'Invalid request', 'INVALID_REQUEST');
  return body as Record<string, unknown>;
}
export async function readBody(
  request: AsyncIterable<Uint8Array>,
  limit = 8192,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > limit) throw new HttpError(413, 'Request too large');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, size);
}
export async function readJsonBody(
  request: IncomingMessage,
  limit = 8192,
): Promise<Record<string, unknown>> {
  const mime = request.headers['content-type']
    ?.split(';')[0]
    ?.trim()
    .toLowerCase();
  if (mime !== 'application/json')
    throw new HttpError(415, 'JSON content required', 'JSON_REQUIRED');
  return decodeJsonBody(await readBody(request, limit));
}
