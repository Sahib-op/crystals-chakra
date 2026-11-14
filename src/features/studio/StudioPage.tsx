import { useEffect, useState, useCallback, useRef } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { studioApi, StudioApiError } from './api.ts';
import type { StudioConfiguration } from '../../../shared/studio-contracts.ts';
import { studioAuth } from './auth.ts';
import { PasswordSignIn, Authenticator } from './SignIn.tsx';
import ReadingWorkspace from './ReadingWorkspace.tsx';
import { useJourney } from '../../components/JourneyContext.jsx';
import { StudioLoadingCard } from '../../components/PageLoading.jsx';
import { withRequestTimeout } from '../../lib/requestTimeout.js';
import './studio.css';

export default function StudioPage() {
  const [cache] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15000,
            retry: (count, error) =>
              !(
                error instanceof StudioApiError &&
                [401, 403].includes(error.status)
              ) && count < 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  useEffect(() => () => cache.clear(), [cache]);
  return (
    <QueryClientProvider client={cache}>
      <StudioEntry cache={cache} />
    </QueryClientProvider>
  );
}
function StudioEntry({ cache }: { cache: QueryClient }) {
  const config = useQuery({
    queryKey: ['studio-config'],
    queryFn: ({ signal }) =>
      withRequestTimeout((requestSignal) => studioApi.config(requestSignal), {
        signal,
        message: 'The studio connection took too long. Please try again.',
      }),
    retry: false,
    staleTime: 60000,
  });
  return (
    <div className="studio-page">
      <Helmet>
        <title>Studio — Crystals Chakra</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      {!config.data?.configured && (
        <header className="studio-heading">
          <div>
            <h1>Studio</h1>
            <p>Readings, publishing and day-to-day work.</p>
          </div>
          <div>
            <Link to="/">View website</Link>
          </div>
        </header>
      )}
      {config.isPending ? (
        <StudioLoadingCard />
      ) : !config.data ? (
        <section className="studio-auth-card">
          <h1>Studio unavailable</h1>
          <p role="alert">
            {config.error instanceof Error
              ? config.error.message
              : 'The sign-in service could not be reached.'}
          </p>
          <button
            className="studio-primary"
            onClick={() => void config.refetch()}
          >
            Try again
          </button>
        </section>
      ) : !config.data.configured ? (
        <section className="studio-auth-card">
          <h1>Studio sign-in</h1>
          <p>Owner sign-in will be available when setup is complete.</p>
          <Link className="studio-primary" to="/">
            Return to the website
          </Link>
        </section>
      ) : (
        <OwnerArea config={config.data} cache={cache} />
      )}
    </div>
  );
}
function OwnerArea({
  config,
  cache,
}: {
  config: StudioConfiguration;
  cache: QueryClient;
}) {
  const [client, setClient] = useState(() => studioAuth(config));
  const location = useLocation(),
    navigate = useNavigate();
  const [invite, setInvite] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('type') === 'invite' &&
      /^[a-zA-Z0-9_-]{20,512}$/.test(params.get('token_hash') || '')
      ? params.get('token_hash')
      : null;
  });
  const [session, setSession] = useState<Session | null>(null),
    [gate, setGate] = useState<
      'checking' | 'signin' | 'mfa' | 'ready' | 'denied'
    >('checking'),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const currentSession = useRef<Session | null | undefined>(undefined);
  const { retryServices } = useJourney();
  useEffect(() => {
    if (invite) navigate('/studio', { replace: true });
  }, [invite, navigate]);
  useEffect(() => {
    if (invite) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, next) => {
      const previous = currentSession.current;
      if (previous === null && next === null) return;
      if (next && previous?.access_token === next.access_token) return;
      currentSession.current = next;
      const refreshing =
        event === 'TOKEN_REFRESHED' &&
        next &&
        previous?.user.id === next.user.id;
      if (!refreshing) {
        cache.removeQueries({ queryKey: ['studio'] });
        setGate(next ? 'checking' : 'signin');
        setError('');
      }
      setSession(next);
    });
    return () => subscription.unsubscribe();
  }, [client, cache, invite]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const isCurrent = () =>
      !controller.signal.aborted && currentSession.current === session;
    void withRequestTimeout(
      (requestSignal) => studioApi.session(session.access_token, requestSignal),
      {
        signal: controller.signal,
        message:
          'Studio access could not be checked in time. Please try again.',
      },
    )
      .then((result) => {
        if (!isCurrent()) return;
        setGate(result.mfaRequired ? 'mfa' : 'ready');
      })
      .catch((reason) => {
        if (!isCurrent()) return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Studio access could not be checked.',
        );
        setGate('denied');
        cache.removeQueries({ queryKey: ['studio'] });
      });
    return () => controller.abort();
  }, [session, attempt, cache]);
  const accessError = useCallback(
    (reason: unknown) => {
      if (
        reason instanceof StudioApiError &&
        [401, 403].includes(reason.status)
      ) {
        cache.removeQueries({ queryKey: ['studio'] });
        setError(reason.message);
        setGate(reason.code === 'MFA_REQUIRED' ? 'mfa' : 'denied');
      }
    },
    [cache],
  );
  async function signOut() {
    cache.removeQueries({ queryKey: ['studio'] });
    currentSession.current = null;
    setSession(null);
    setInvite(null);
    setGate('signin');
    setError('');
    try {
      await client.auth.signOut({ scope: 'local' });
    } finally {
      setClient(studioAuth(config, true));
    }
  }
  return (
    <>
      <header className="studio-heading">
        <div>
          <h1>Studio</h1>
          <p>
            {config.localDemo
              ? 'Local studio preview'
              : 'Readings, publishing and day-to-day work.'}
          </p>
        </div>
        <div>
          <Link to="/">View website</Link>
          {session && <button onClick={() => void signOut()}>Sign out</button>}
        </div>
      </header>
      {(invite || gate === 'signin') && (
        <PasswordSignIn
          client={client}
          invite={invite}
          localDemo={config.localDemo}
          onInviteComplete={() => setInvite(null)}
        />
      )}
      {gate === 'checking' && !invite && (
        <StudioLoadingCard title="Verifying studio access…" />
      )}
      {gate === 'denied' && !invite && (
        <section className="studio-auth-card">
          <h2>Access unavailable</h2>
          <p className="studio-error" role="alert">
            {error}
          </p>
          <button
            className="studio-primary"
            onClick={() => {
              setGate('checking');
              setAttempt((value) => value + 1);
            }}
          >
            Check again
          </button>
          <button className="studio-secondary" onClick={() => void signOut()}>
            Use another account
          </button>
        </section>
      )}
      {gate === 'mfa' && <Authenticator client={client} />}
      {gate === 'ready' && session && (
        <ReadingWorkspace
          token={session.access_token}
          userId={session.user.id}
          onAccessError={accessError}
          onPublishedChange={retryServices}
        />
      )}
    </>
  );
}
