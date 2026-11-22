import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studioApi, StudioApiError } from './api.ts';
import type {
  StudioReading,
  ReadingCreate,
  Practitioners,
} from '../../../shared/studio-contracts.ts';
import { ReadingPackageCard } from '../../pages/Home.jsx';
import WhatsAppIcon from '../../components/WhatsAppIcon.jsx';
import {
  isReadingHex,
  readingCardColor,
  READING_COLOR_HEX,
} from '../../../shared/reading-layout.ts';
import type { CSSProperties } from 'react';
interface Props {
  token: string;
  userId: string;
  onAccessError: (error: unknown) => void;
  onPublishedChange: () => void;
}
const NEW_READING = ':new';
const previewAction = (
  <span className="royal-button">
    Ask on WhatsApp <WhatsAppIcon size={17} />
  </span>
);
const readingKey = (userId: string) =>
  `crystals-chakra:studio:last-reading:v1:${userId}`;

function restoreReading(userId: string) {
  try {
    const id = localStorage.getItem(readingKey(userId));
    return id && /^[a-z][a-z0-9-]{0,47}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function rememberReading(userId: string, id: string | null) {
  try {
    if (id) localStorage.setItem(readingKey(userId), id);
    else localStorage.removeItem(readingKey(userId));
  } catch {
    // The editor remains usable when browser storage is unavailable.
  }
}

function positionLabel(
  cards: StudioReading[],
  size: StudioReading['cardSize'],
) {
  let row = 1;
  let used = 0;
  for (const card of [...cards, { cardSize: size }]) {
    const span = card.cardSize === 'wide' ? 2 : 1;
    if (used + span > 3) {
      row++;
      used = 0;
    }
    used += span;
  }
  return `Row ${row}, position ${used - (size === 'wide' ? 1 : 0)}`;
}
export default function ReadingWorkspace({
  token,
  userId,
  onAccessError,
  onPublishedChange,
}: Props) {
  const cache = useQueryClient();
  const [status, setStatus] = useState(''),
    [after, setAfter] = useState(''),
    [selected, setSelected] = useState<string | null>(null),
    [remembered, setRemembered] = useState(() => restoreReading(userId)),
    [editorVersion, setEditorVersion] = useState(0),
    [tab, setTab] = useState<'edit' | 'preview'>('edit'),
    [message, setMessage] = useState('');
  const list = useQuery({
    queryKey: ['studio', userId, 'readings', status, after],
    queryFn: ({ signal }) => studioApi.readings(token, status, after, signal),
  });
  const people = useQuery({
    queryKey: ['studio', userId, 'practitioners'],
    queryFn: ({ signal }) => studioApi.practitioners(token, signal),
  });
  const published = useQuery({
    queryKey: ['studio', userId, 'readings', 'published', ''],
    queryFn: ({ signal }) => studioApi.readings(token, 'published', '', signal),
  });
  const latest = list.data?.items.reduce<StudioReading | null>(
    (recent, item) =>
      !recent || Date.parse(item.updatedAt) > Date.parse(recent.updatedAt)
        ? item
        : recent,
    null,
  );
  const shownId = selected ?? remembered ?? latest?.id;
  const detail = useQuery({
    queryKey: ['studio', userId, 'reading', shownId],
    enabled: Boolean(shownId && shownId !== NEW_READING),
    queryFn: ({ signal }) => studioApi.reading(token, shownId!, signal),
  });
  useEffect(() => {
    for (const error of [
      list.error,
      people.error,
      detail.error,
      published.error,
    ]) {
      if (error) onAccessError(error);
    }
  }, [list.error, people.error, detail.error, published.error, onAccessError]);
  useEffect(() => {
    if (selected && selected !== NEW_READING && detail.data?.id === selected) {
      rememberReading(userId, selected);
      setRemembered(selected);
      return;
    }
    if (
      !selected &&
      remembered &&
      detail.error instanceof StudioApiError &&
      detail.error.status === 404
    ) {
      rememberReading(userId, null);
      setRemembered(null);
    }
  }, [detail.data, detail.error, remembered, selected, userId]);
  function choose(id: string) {
    setSelected(id || null);
    setTab('edit');
    setMessage('');
  }
  async function reloadEditor() {
    const result = await detail.refetch();
    if (result.isSuccess) setEditorVersion((value) => value + 1);
  }
  async function saved(record: StudioReading) {
    rememberReading(userId, record.id);
    setRemembered(record.id);
    const queryKey = ['studio', userId, 'reading', record.id];
    await cache.cancelQueries({ queryKey, exact: true });
    cache.setQueryData(queryKey, record);
    setSelected(record.id);
    setEditorVersion((value) => value + 1);
    setMessage(
      record.draft
        ? 'Draft saved. The published card is unchanged.'
        : record.status === 'published'
          ? 'Reading saved and published.'
          : 'Reading saved as ' + record.status + '.',
    );
    await cache.invalidateQueries({ queryKey: ['studio', userId, 'readings'] });
    await cache.invalidateQueries({
      queryKey: ['studio', userId, 'history', record.id],
    });
    onPublishedChange();
  }
  const recent = detail.data ?? (latest?.id === shownId ? latest : null);
  return (
    <section
      className="studio-workspace"
      aria-labelledby="studio-readings-title"
    >
      <div className="studio-toolbar">
        <h2 id="studio-readings-title">Readings</h2>
        <div className="studio-toolbar-actions">
          {selected && (
            <button type="button" onClick={() => choose('')}>
              Back to catalogue
            </button>
          )}
          <button
            className="studio-primary"
            onClick={() => choose(NEW_READING)}
          >
            New reading
          </button>
        </div>
      </div>
      <p role="status" className="studio-save-status">
        {message}
      </p>
      <div className="studio-workspace-grid">
        <aside className="studio-reading-list" aria-label="Reading packages">
          <label>
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setAfter('');
              }}
            >
              <option value="">All readings</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="studio-mobile-select">
            Choose a reading
            <select
              value={selected && selected !== NEW_READING ? selected : ''}
              onChange={(event) => choose(event.target.value)}
            >
              <option value="">Choose a reading</option>
              {list.data?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.status}
                </option>
              ))}
            </select>
          </label>
          {list.isPending ? (
            <p role="status">Loading readings…</p>
          ) : list.error ? (
            <div role="alert">
              <p>Readings could not be loaded.</p>
              <button onClick={() => void list.refetch()}>Try again</button>
            </div>
          ) : (
            <>
              <div className="studio-reading-buttons">
                {list.data.items.map((item) => (
                  <button
                    key={item.id}
                    className={selected === item.id ? 'selected' : ''}
                    aria-pressed={selected === item.id}
                    onClick={() => choose(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.status}</span>
                  </button>
                ))}
              </div>
              {!list.data.items.length && <p>No readings in this view.</p>}
              <div className="studio-pagination">
                {after && (
                  <button onClick={() => setAfter('')}>First page</button>
                )}
                {list.data.nextCursor && (
                  <button onClick={() => setAfter(list.data.nextCursor!)}>
                    More readings
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
        <div className="studio-editor-region">
          {!selected &&
          !recent &&
          (list.isPending || (shownId && detail.isPending)) ? (
            <p role="status">Loading recent reading…</p>
          ) : !selected ? (
            <div className="studio-empty">
              <h3>Your reading catalogue</h3>
              {recent ? (
                <div className="services-section studio-recent-reading">
                  <p>
                    {remembered ? 'Last opened' : 'Recently updated'} ·{' '}
                    <span>{recent.status}</span>
                  </p>
                  <div className="reading-grid theme-royal">
                    <ReadingPackageCard
                      service={{
                        ...recent,
                        practitioner: people.data?.find(
                          (person) => person.id === recent.practitionerId,
                        ),
                        price:
                          recent.priceMinor === null
                            ? null
                            : recent.priceMinor / 100,
                      }}
                      livePrices
                      action={
                        <button
                          type="button"
                          className="royal-button"
                          onClick={() => choose(recent.id)}
                          aria-label={`Open reading: ${recent.title}`}
                        >
                          Open reading
                        </button>
                      }
                    />
                  </div>
                </div>
              ) : (
                <p>
                  Choose a reading to review its copy, price and publishing
                  state.
                </p>
              )}
            </div>
          ) : selected !== NEW_READING && detail.isPending ? (
            <p role="status">Opening reading…</p>
          ) : selected !== NEW_READING && !detail.data ? (
            <div role="alert">
              <p>This reading could not be opened.</p>
              <button onClick={() => void detail.refetch()}>Try again</button>
            </div>
          ) : people.isPending ? (
            <p role="status">Loading practitioners…</p>
          ) : !people.data ? (
            <p role="alert">
              Practitioner choices are unavailable. Try reloading.
            </p>
          ) : (
            <ReadingEditor
              key={selected + ':' + editorVersion}
              record={selected === NEW_READING ? null : detail.data!}
              practitioners={people.data!}
              published={published.data?.items}
              reloadLayout={() => void published.refetch()}
              token={token}
              userId={userId}
              tab={tab}
              setTab={setTab}
              onSaved={saved}
              onAccessError={onAccessError}
              onReload={() => void reloadEditor()}
            />
          )}
        </div>
      </div>
    </section>
  );
}
function ReadingEditor({
  record: initialRecord,
  practitioners,
  published,
  reloadLayout,
  token,
  userId,
  tab,
  setTab,
  onSaved,
  onAccessError,
  onReload,
}: {
  record: StudioReading | null;
  practitioners: Practitioners;
  published: StudioReading[] | undefined;
  reloadLayout: () => void;
  token: string;
  userId: string;
  tab: 'edit' | 'preview';
  setTab: (value: 'edit' | 'preview') => void;
  onSaved: (record: StudioReading) => Promise<void>;
  onAccessError: (error: unknown) => void;
  onReload: () => void;
}) {
  const [record] = useState(initialRecord);
  const fields = record?.draft ?? record;
  const initialColor = readingCardColor(record?.id ?? '', fields?.cardColor);
  const [id, setId] = useState(record?.id ?? ''),
    [title, setTitle] = useState(fields?.title ?? ''),
    [hindi, setHindi] = useState(fields?.hindiTitle ?? ''),
    [type, setType] = useState<'tarot' | 'astrology'>(
      fields?.type ?? 'astrology',
    ),
    [description, setDescription] = useState(fields?.description ?? ''),
    [features, setFeatures] = useState(fields?.features.join('\n') ?? ''),
    [price, setPrice] = useState(
      fields?.priceMinor === null || !fields
        ? ''
        : String(fields.priceMinor / 100),
    ),
    [practitioner, setPractitioner] = useState(fields?.practitionerId ?? ''),
    [placement, setPlacement] = useState<string | undefined>(
      record?.draft?.placeBefore === null ? '' : record?.draft?.placeBefore,
    ),
    [cardSize, setCardSize] = useState<NonNullable<StudioReading['cardSize']>>(
      fields?.cardSize ?? 'standard',
    ),
    [colorChoice, setColorChoice] = useState(
      isReadingHex(initialColor) ? 'custom' : initialColor,
    ),
    [hex, setHex] = useState(
      isReadingHex(initialColor) ? initialColor : '#103e60',
    );
  const validColor = colorChoice !== 'custom' || isReadingHex(hex);
  const cardColor = colorChoice === 'custom' ? hex : colorChoice;
  const featured = id === 'tarot';
  const neighbours = (published ?? [])
    .filter((item) => item.id !== 'tarot' && item.id !== record?.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1));
  const savedNeighbour =
    record &&
    neighbours.find(
      (item) =>
        item.sortOrder > record.sortOrder ||
        (item.sortOrder === record.sortOrder && item.id > record.id),
    );
  const before = placement ?? savedNeighbour?.id ?? '';
  const lostPosition = Boolean(
    before && !neighbours.some((item) => item.id === before),
  );
  const insertAt =
    before && !lostPosition
      ? neighbours.findIndex((item) => item.id === before)
      : neighbours.length;
  const slots = [...neighbours, null].map((item, index) => ({
    value: item?.id ?? '',
    label: positionLabel(neighbours.slice(0, index), cardSize),
    neighbour: item?.title,
  }));
  const reader = practitioners.find((person) => person.id === practitioner);
  const draftCard = {
    id,
    title: title || 'Reading title',
    hindiTitle: hindi,
    description: description || 'Your approved description will appear here.',
    features: features
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    price: price === '' ? null : Number(price),
    practitioner: reader,
    cardSize,
    cardColor: validColor ? cardColor : initialColor,
  };
  const history = useQuery({
    queryKey: ['studio', userId, 'history', record?.id],
    enabled: Boolean(record),
    queryFn: ({ signal }) => studioApi.history(token, record!.id, signal),
  });
  useEffect(() => {
    if (history.error) onAccessError(history.error);
  }, [history.error, onAccessError]);
  const save = useMutation<
    StudioReading,
    Error,
    { input: ReadingCreate; keepLive: boolean }
  >({
    mutationFn: async ({ input, keepLive }) => {
      if (record) {
        const { id: _id, ...fields } = input;
        return studioApi.update(token, record.id, {
          ...fields,
          sortOrder: fields.sortOrder ?? record.sortOrder,
          revision: record.revision,
          ...(keepLive ? { saveDraft: true } : {}),
        });
      }
      return studioApi.create(token, input);
    },
    onSuccess: onSaved,
    onError: onAccessError,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validColor) return;
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
      'value',
    );
    const keepLive =
      action !== 'publish' &&
      action !== 'archive' &&
      record?.status === 'published';
    const input: ReadingCreate = {
      id,
      type,
      title: title.trim(),
      hindiTitle: hindi.trim() || null,
      description: description.trim(),
      features: features
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      priceMinor: price === '' ? null : Number(price) * 100,
      practitionerId: practitioner || null,
      status:
        action === 'publish'
          ? 'published'
          : action === 'archive' || record?.status === 'archived'
            ? 'archived'
            : 'draft',
      ...(placement !== undefined || !record
        ? { placeBefore: before || null }
        : {}),
      cardSize,
      cardColor,
    };
    save.mutate({ input, keepLive });
  }
  return (
    <div className="studio-editor">
      <div className="studio-editor-heading">
        <h3>{record ? record.title : 'New reading'}</h3>
        <div className="studio-view-toggle" aria-label="Editor view">
          <button aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>
            Edit
          </button>
          <button
            aria-pressed={tab === 'preview'}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
      </div>
      <form
        onSubmit={submit}
        aria-busy={save.isPending}
        onInvalidCapture={(event) => {
          if (tab !== 'preview') return;
          const form = event.currentTarget;
          setTab('edit');
          requestAnimationFrame(() =>
            form.querySelector<HTMLElement>(':invalid')?.focus(),
          );
        }}
      >
        {tab === 'preview' && (
          <div className="studio-layout-preview">
            <p>
              {featured
                ? 'The featured Tarot reading has its own section.'
                : `Desktop layout · ${slots[insertAt]?.label} · Your card has a gold outline`}
            </p>
            {!published ? (
              <button type="button" onClick={reloadLayout}>
                Load published layout
              </button>
            ) : (
              <div className="studio-preview-scroll">
                <div className="services-section theme-royal">
                  <div
                    className="royal-services reading-grid"
                    style={
                      {
                        '--count': neighbours.length + 1,
                        '--cols': Math.min(neighbours.length + 1, 3),
                      } as CSSProperties
                    }
                  >
                    {featured && (
                      <ReadingPackageCard
                        service={draftCard}
                        livePrices
                        action={previewAction}
                        previewCurrent
                      />
                    )}
                    {[
                      ...neighbours.slice(0, insertAt),
                      ...(!featured ? [null] : []),
                      ...neighbours.slice(insertAt),
                    ].map((item) =>
                      item ? (
                        <ReadingPackageCard
                          key={item.id}
                          livePrices
                          action={previewAction}
                          service={{
                            ...item,
                            practitioner: practitioners.find(
                              (person) => person.id === item.practitionerId,
                            ),
                            price:
                              item.priceMinor === null
                                ? null
                                : item.priceMinor / 100,
                          }}
                        />
                      ) : (
                        <ReadingPackageCard
                          key="current-preview"
                          service={draftCard}
                          livePrices
                          action={previewAction}
                          previewCurrent
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="studio-edit-fields" hidden={tab !== 'edit'}>
          <div className="studio-field-grid">
            <label>
              Title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Hindi title <span>(optional)</span>
              <input
                lang="hi"
                maxLength={160}
                value={hindi}
                onChange={(event) => setHindi(event.target.value)}
              />
            </label>
          </div>
          <div className="studio-field-grid">
            <label>
              Reading address
              <input
                required
                pattern={'[a-z][a-z0-9\\-]{0,47}'}
                maxLength={48}
                disabled={Boolean(record)}
                value={id}
                placeholder="e.g. personal-tarot"
                onChange={(event) => setId(event.target.value.toLowerCase())}
              />
            </label>
            <label>
              Type
              <select
                value={type}
                onChange={(event) => setType(event.target.value as typeof type)}
              >
                <option value="astrology">Astrology</option>
                <option value="tarot">Tarot</option>
              </select>
            </label>
          </div>
          <label>
            Description
            <textarea
              required
              rows={4}
              maxLength={600}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Included features <span>(one per line, up to 12)</span>
            <textarea
              required
              rows={4}
              maxLength={2891}
              value={features}
              onChange={(event) => setFeatures(event.target.value)}
            />
          </label>
          <div className="studio-field-grid">
            <label>
              Price (₹) <span>(blank for enquiry)</span>
              <input
                type="number"
                min={0}
                max={10000000}
                step={1}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            <label>
              Practitioner
              <select
                value={practitioner}
                onChange={(event) => setPractitioner(event.target.value)}
              >
                <option value="">No named practitioner</option>
                {practitioners.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.published ? '' : ' · unpublished'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="studio-field-grid">
            {!featured && (
              <label>
                Card position
                <select
                  value={before}
                  disabled={!published}
                  onChange={(event) => setPlacement(event.target.value)}
                >
                  {lostPosition && (
                    <option value={before}>Choose a new position</option>
                  )}
                  {slots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                      {slot.neighbour
                        ? ` · Before ${slot.neighbour}`
                        : ' · After the last card'}
                    </option>
                  ))}
                </select>
                <small>
                  Positions show the desktop layout. On smaller screens the
                  cards reflow in the same order.
                </small>
              </label>
            )}
          </div>
          <div className="studio-field-grid">
            <label>
              Card size
              <select
                value={cardSize}
                onChange={(event) =>
                  setCardSize(event.target.value as typeof cardSize)
                }
              >
                <option value="standard">Standard</option>
                <option value="compact">Compact</option>
                <option value="wide">Wide</option>
              </select>
            </label>
            <label>
              Card colour
              <select
                value={colorChoice}
                onChange={(event) => setColorChoice(event.target.value)}
              >
                <option value="navy">Royal navy</option>
                <option value="burgundy">Burgundy</option>
                <option value="emerald">Emerald</option>
                <option value="indigo">Indigo</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {colorChoice === 'custom' && (
              <label>
                Hex colour
                <input
                  value={hex}
                  onChange={(event) => setHex(event.target.value)}
                  pattern={READING_COLOR_HEX.source}
                  maxLength={7}
                  required
                  placeholder="#315a78"
                  spellCheck={false}
                />
                <small>
                  Use six digits, like #315a78. The card uses a darker tint to
                  keep the text readable.
                </small>
              </label>
            )}
          </div>
        </div>
        {save.error && (
          <div className="studio-error" role="alert">
            <p>{save.error.message}</p>
            {save.error instanceof StudioApiError &&
              save.error.code === 'REVISION_CONFLICT' && (
                <button type="button" onClick={onReload}>
                  Discard edits and reload
                </button>
              )}
          </div>
        )}
        <div className="studio-save-row">
          <p>
            {record?.draft
              ? 'This reading has saved draft changes.'
              : 'Save keeps edits private until you publish.'}
          </p>
          <div className="studio-toolbar-actions">
            <button
              type="submit"
              value="save"
              className="studio-secondary"
              disabled={save.isPending}
            >
              {save.isPending ? 'Working…' : 'Save draft'}
            </button>
            <button
              type="submit"
              value="publish"
              className="studio-primary"
              disabled={save.isPending}
            >
              Publish
            </button>
            {tab === 'edit' && record && record.status !== 'archived' && (
              <button type="submit" value="archive" disabled={save.isPending}>
                Archive
              </button>
            )}
          </div>
        </div>
      </form>
      {record && (
        <details className="studio-history">
          <summary>Change history</summary>
          {history.isPending ? (
            <p>Loading history…</p>
          ) : history.error ? (
            <p role="alert">History could not be loaded.</p>
          ) : (
            <ol>
              {history.data.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.action} · revision {item.revision}
                  </span>
                  <time dateTime={item.occurredAt}>
                    {new Intl.DateTimeFormat('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Kolkata',
                    }).format(new Date(item.occurredAt))}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </details>
      )}
    </div>
  );
}
