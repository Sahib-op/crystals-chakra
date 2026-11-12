import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studioApi, StudioApiError } from './api.ts';
import type {
  StudioReading,
  ReadingCreate,
  Practitioners,
} from '../../../shared/studio-contracts.ts';
import { readingContact } from '../../../shared/contact.js';
interface Props {
  token: string;
  userId: string;
  onAccessError: (error: unknown) => void;
  onPublishedChange: () => void;
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
    [editorVersion, setEditorVersion] = useState(0),
    [message, setMessage] = useState('');
  const list = useQuery({
    queryKey: ['studio', userId, 'readings', status, after],
    queryFn: ({ signal }) => studioApi.readings(token, status, after, signal),
  });
  const people = useQuery({
    queryKey: ['studio', userId, 'practitioners'],
    queryFn: ({ signal }) => studioApi.practitioners(token, signal),
  });
  const detail = useQuery({
    queryKey: ['studio', userId, 'reading', selected],
    enabled: Boolean(selected && selected !== 'new'),
    queryFn: ({ signal }) => studioApi.reading(token, selected!, signal),
  });
  useEffect(() => {
    for (const error of [list.error, people.error, detail.error]) {
      if (error) onAccessError(error);
    }
  }, [list.error, people.error, detail.error, onAccessError]);
  function choose(id: string) {
    setSelected(id);
    setMessage('');
  }
  async function reloadEditor() {
    const result = await detail.refetch();
    if (result.isSuccess) setEditorVersion((value) => value + 1);
  }
  async function saved(record: StudioReading) {
    const queryKey = ['studio', userId, 'reading', record.id];
    await cache.cancelQueries({ queryKey, exact: true });
    cache.setQueryData(queryKey, record);
    setSelected(record.id);
    setEditorVersion((value) => value + 1);
    setMessage(
      record.status === 'published'
        ? 'Reading saved and published.'
        : 'Reading saved as ' + record.status + '.',
    );
    await cache.invalidateQueries({ queryKey: ['studio', userId, 'readings'] });
    await cache.invalidateQueries({
      queryKey: ['studio', userId, 'history', record.id],
    });
    onPublishedChange();
  }
  return (
    <section
      className="studio-workspace"
      aria-labelledby="studio-readings-title"
    >
      <div className="studio-toolbar">
        <h2 id="studio-readings-title">Readings</h2>
        <button className="studio-primary" onClick={() => choose('new')}>
          New reading
        </button>
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
              value={selected && selected !== 'new' ? selected : ''}
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
          {!selected ? (
            <div className="studio-empty">
              <h3>Your reading catalogue</h3>
              <p>
                Choose a reading to review its copy, price and publishing state.
              </p>
            </div>
          ) : selected !== 'new' && detail.isPending ? (
            <p role="status">Opening reading…</p>
          ) : selected !== 'new' && !detail.data ? (
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
              record={selected === 'new' ? null : detail.data!}
              practitioners={people.data!}
              token={token}
              userId={userId}
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
  token,
  userId,
  onSaved,
  onAccessError,
  onReload,
}: {
  record: StudioReading | null;
  practitioners: Practitioners;
  token: string;
  userId: string;
  onSaved: (record: StudioReading) => Promise<void>;
  onAccessError: (error: unknown) => void;
  onReload: () => void;
}) {
  const [record] = useState(initialRecord);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [id, setId] = useState(record?.id ?? ''),
    [title, setTitle] = useState(record?.title ?? ''),
    [hindi, setHindi] = useState(record?.hindiTitle ?? ''),
    [type, setType] = useState<'tarot' | 'astrology'>(
      record?.type ?? 'astrology',
    ),
    [description, setDescription] = useState(record?.description ?? ''),
    [features, setFeatures] = useState(record?.features.join('\n') ?? ''),
    [price, setPrice] = useState(
      record?.priceMinor === null || !record
        ? ''
        : String(record.priceMinor / 100),
    ),
    [practitioner, setPractitioner] = useState(record?.practitionerId ?? ''),
    [state, setState] = useState<StudioReading['status']>(
      record?.status ?? 'draft',
    ),
    [order, setOrder] = useState(record?.sortOrder ?? 0);
  const history = useQuery({
    queryKey: ['studio', userId, 'history', record?.id],
    enabled: Boolean(record),
    queryFn: ({ signal }) => studioApi.history(token, record!.id, signal),
  });
  useEffect(() => {
    if (history.error) onAccessError(history.error);
  }, [history.error, onAccessError]);
  const save = useMutation<StudioReading, Error, ReadingCreate>({
    mutationFn: async (input: ReadingCreate) => {
      if (record) {
        const { id: _id, ...fields } = input;
        return studioApi.update(token, record.id, {
          ...fields,
          revision: record.revision,
        });
      }
      return studioApi.create(token, input);
    },
    onSuccess: onSaved,
    onError: onAccessError,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
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
      status: state,
      sortOrder: order,
    };
    save.mutate(input);
  }
  const reader = practitioners.find((person) => person.id === practitioner);
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
      {tab === 'preview' ? (
        <div className="studio-preview">
          <article>
            <span className="studio-preview-hindi" lang="hi" aria-hidden="true">
              {hindi}
            </span>
            <h4>{title || 'Reading title'}</h4>
            {reader && (
              <p className="studio-preview-reader">with {reader.name}</p>
            )}
            <p>
              {description || 'Your approved description will appear here.'}
            </p>
            <ul>
              {features
                .split('\n')
                .filter((line) => line.trim())
                .map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
            </ul>
            <strong className="studio-preview-price">
              {price === ''
                ? 'Ask for price'
                : '₹' + Number(price).toLocaleString('en-IN')}
            </strong>
            <a
              className="studio-primary"
              href={
                readingContact({
                  title: title || 'a reading',
                  ...(reader ? { practitioner: { name: reader.name } } : {}),
                }).whatsapp
              }
              target="_blank"
              rel="noreferrer"
            >
              Ask on WhatsApp
            </a>
          </article>
          <p>
            Preview only. Save the reading as published to show it on the
            website.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} aria-busy={save.isPending}>
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
            <label>
              Publishing state
              <select
                value={state}
                onChange={(event) =>
                  setState(event.target.value as typeof state)
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              Display order
              <input
                type="number"
                required
                min={0}
                max={9999}
                step={1}
                value={order}
                onChange={(event) => setOrder(Number(event.target.value))}
              />
            </label>
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
              {state === 'published'
                ? 'Published readings appear on the main page.'
                : 'Drafts and archived readings stay private.'}
            </p>
            <button className="studio-primary" disabled={save.isPending}>
              {save.isPending
                ? 'Saving…'
                : state === 'published'
                  ? 'Save and publish'
                  : 'Save reading'}
            </button>
          </div>
        </form>
      )}
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
