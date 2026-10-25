/**
 * Register. The form holds no validation wording of its own: every message shown
 * is the one `registerUser` returned for that field, including the form-level
 * failure slot.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, UserPlus } from 'lucide-react';

import { Button, Card, CardHeader, Field, Notice, TextInput } from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { PASSWORD_MIN_LENGTH, PBKDF2_ITERATIONS } from '../../core/auth.js';

const LINK_QUIET = 'tm-focus rounded-control text-body font-medium text-accent hover:underline';

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' };

export default function RegisterView() {
  const { register } = useData();
  const navigate = useNavigate();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const result = await register(values);
    setBusy(false);
    if (result && result.ok) {
      navigate('/', { replace: true });
      return;
    }
    setErrors((result && result.errors) || {});
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Create an account</h1>
          <p className="mt-1 text-body text-ink-secondary">
            One account owns its own trips, saved places, itinerary, packing list and expenses.
          </p>
        </div>
        <Link to="/signin" className={`${LINK_QUIET} pt-2`}>
          I already have an account
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <CardHeader title="Your details" meta="Nothing is sent anywhere" />

            {errors.form ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-card border border-danger/25 bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                <AlertTriangle size={15} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
                <span>{errors.form}</span>
              </div>
            ) : null}

            <Field label="Name" htmlFor="register-name" error={errors.name}>
              <TextInput
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={update('name')}
                placeholder="Your name"
              />
            </Field>

            <Field label="Email" htmlFor="register-email" error={errors.email}>
              <TextInput
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={update('email')}
                placeholder="you@example.com"
              />
            </Field>

            <Field
              label="Password"
              htmlFor="register-password"
              error={errors.password}
              hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            >
              <TextInput
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={update('password')}
                placeholder="Choose a password"
              />
            </Field>

            <Field label="Confirm password" htmlFor="register-confirm" error={errors.confirmPassword}>
              <TextInput
                id="register-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={values.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Repeat the password"
              />
            </Field>

            <div className="pt-1">
              <Button type="submit" variant="primary" icon={UserPlus} disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <CardHeader title="How your password is stored" meta="PBKDF2-HMAC-SHA256" />
            <Notice tone="accent" icon={ShieldCheck}>
              The password is salted and hashed with PBKDF2-HMAC-SHA256 over {String(PBKDF2_ITERATIONS)} iterations
              before it is written, and it is never stored as text. Only the salt, the iteration count and the derived
              hash are kept, so the original password cannot be read back from the stored record.
            </Notice>
            <p className="text-label text-ink-secondary">
              The rest of the account record is a name, an email and an id. Signing in compares a freshly derived hash
              against the stored one.
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHeader title="What the account owns" meta="Per-account records" />
            <ul className="flex flex-col gap-1.5 border-t border-line pt-2.5 text-label text-ink-secondary">
              <li>
                Every trip, saved place, itinerary activity, packing item and expense is stamped with the id of the
                account that created it, and the data layer only ever returns records for the signed-in account
                (NFR-4).
              </li>
              <li>
                Those records are stored, not session state: they survive signing out and signing back in, and they
                survive a browser refresh (NFR-6).
              </li>
              <li>
                Because the storage is this browser&apos;s localStorage, anyone with access to this browser profile can
                read what is stored.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
