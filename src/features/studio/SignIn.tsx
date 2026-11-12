import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export function PasswordSignIn({
  client,
  invite,
  onInviteComplete,
  localDemo = false,
}: {
  client: SupabaseClient;
  invite: string | null;
  onInviteComplete: () => void;
  localDemo?: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    let verifiedInvite = accepted;
    try {
      if (invite) {
        if (!accepted) {
          const result = await client.auth.verifyOtp({
            token_hash: invite,
            type: 'invite',
          });
          if (result.error) throw result.error;
          verifiedInvite = true;
          setAccepted(true);
        }
      } else {
        const result = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (result.error) throw result.error;
      }
      if (invite) {
        const updated = await client.auth.updateUser({ password });
        if (updated.error) throw updated.error;
        onInviteComplete();
      }
      setPassword('');
    } catch {
      setError(
        invite
          ? verifiedInvite
            ? 'Your password could not be saved. Use at least 12 characters and try again.'
            : 'This invitation could not be completed. Request a fresh studio invitation.'
          : 'Sign-in failed. Check your email and password, then try again.',
      );
      setPassword('');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="studio-auth-card" aria-labelledby="studio-signin-title">
      <h2 id="studio-signin-title">
        {invite ? 'Accept your invitation' : 'Studio sign-in'}
      </h2>
      <p>
        {invite
          ? 'Set your password to continue. You’ll set up an authenticator before opening private studio records.'
          : 'Use the account invited by the studio owner.'}
      </p>
      {localDemo && !invite && (
        <button
          className="studio-demo-account"
          type="button"
          onClick={() => {
            setEmail('owner@chakra.test');
            setPassword('local-preview-only');
          }}
        >
          Use the local preview account
        </button>
      )}
      <form onSubmit={submit} aria-busy={busy}>
        {!invite && (
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        )}
        <label>
          {invite ? 'New password' : 'Password'}
          <input
            name="password"
            type="password"
            autoComplete={invite ? 'new-password' : 'current-password'}
            minLength={invite ? 12 : 1}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="studio-error" role="alert">
            {error}
          </p>
        )}
        <button className="studio-primary" disabled={busy}>
          {busy ? 'Checking…' : invite ? 'Accept invitation' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}

export function Authenticator({ client }: { client: SupabaseClient }) {
  const [factor, setFactor] = useState<string | null>(null),
    [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [checked, setChecked] = useState(false);
  async function prepare() {
    setBusy(true);
    setError('');
    try {
      const result = await client.auth.mfa.listFactors();
      if (result.error) throw result.error;
      const verified = result.data.totp.find(
        (item) => item.status === 'verified',
      );
      if (verified) setFactor(verified.id);
      setChecked(true);
    } catch {
      setError('Your authenticator settings could not be checked. Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function enroll() {
    setBusy(true);
    setError('');
    try {
      const result = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName:
          'Crystals Chakra ' + new Date().toISOString().slice(0, 19),
      });
      if (result.error) throw result.error;
      setFactor(result.data.id);
      setSetup({
        qr: result.data.totp.qr_code.replace(
          /^data:image\/svg\+xml;utf-8,/,
          '',
        ),
        secret: result.data.totp.secret,
      });
    } catch {
      setError(
        'Authenticator setup could not start. Retry, or ask the owner to review unfinished factors.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!factor) return;
    setBusy(true);
    setError('');
    try {
      const result = await client.auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      });
      if (result.error) throw result.error;
      setCode('');
      setSetup(null);
    } catch {
      setError(
        'That code could not be verified. Use the latest six-digit authenticator code.',
      );
      setCode('');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="studio-auth-card" aria-labelledby="studio-mfa-title">
      <h2 id="studio-mfa-title">Verify your authenticator</h2>
      {!checked && !factor ? (
        <>
          <p>Check your authenticator to continue into the private studio.</p>
          <button className="studio-primary" onClick={prepare} disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </>
      ) : !factor ? (
        <>
          <p>
            Add Crystals Chakra to an authenticator app before opening private
            records.
          </p>
          <button className="studio-primary" onClick={enroll} disabled={busy}>
            {busy ? 'Preparing…' : 'Set up authenticator'}
          </button>
        </>
      ) : (
        <>
          {setup ? (
            <div className="studio-mfa-setup">
              <p>
                Scan this code in your authenticator app, then enter its
                six-digit code.
              </p>
              <img
                width="220"
                height="220"
                alt="Authenticator setup QR code"
                src={
                  'data:image/svg+xml;charset=utf-8,' +
                  encodeURIComponent(setup.qr)
                }
              />
              <details>
                <summary>Enter the setup key manually</summary>
                <code>{setup.secret}</code>
              </details>
            </div>
          ) : (
            <p>Enter the six-digit code from your authenticator app.</p>
          )}
          <form onSubmit={verify} aria-busy={busy}>
            <label>
              Authenticator code
              <input
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ''))
                }
              />
            </label>
            <button className="studio-primary" disabled={busy}>
              {busy ? 'Verifying…' : 'Open studio'}
            </button>
          </form>
        </>
      )}
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
