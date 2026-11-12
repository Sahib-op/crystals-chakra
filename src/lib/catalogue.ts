import { isReadingCatalog } from '../../shared/catalog.ts';
import type { ReadingCatalogue } from '../../shared/contracts.ts';
import { request } from './api.js';

export async function loadReadingCatalogue(
  signal: AbortSignal,
): Promise<ReadingCatalogue> {
  const value: unknown = await request('services', undefined, signal);
  if (!isReadingCatalog(value)) throw new Error('Invalid reading catalogue');
  return value;
}
