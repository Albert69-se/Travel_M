/**
 * Sign in. Two paths, both exercising the same data-layer call: typed
 * credentials, or the published demo account through the secondary button.
 *
 * Validation wording is never invented here — the email/password messages come
 * from `validateLogin` and the credential failure from `authenticate`, and the
 * `form` message is rendered in its own `role="alert"` region.
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, LogIn, UserPlus } from 'lucide-react';

import { Button, Card, CardHeader, Field, FinePrint, KeyValue, Notice, TextInput } from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { DEMO_CREDENTIALS } from '../../core/auth.js';

const LINK_QUIET = 'tm-focus rounded-control text-body font-medium text-accent hover:underline';

export default function SignInView() {
  const { signIn, signInAsDemo } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  /* Where to land after signing in — set by RequireSignIn, '/' otherwise. */
  const from = location.state && typeof location.state.from === 'string' ? location.state.from : '/';
  const complete = values.email.trim() !== '' && values.password !== '';

  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const finish = (result) => {
    if (result && result.ok) {
      navigate(from, { replace: true });
      return;
    }
    setErrors((result && result.errors) || {});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (values.email.trim() === '') next.email = 'Enter your email address.';
    if (values.password === '') next.password = 'Enter your password.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setBusy(true);
    setErrors({});
    const result = await signIn({ email: values.email, password: values.password });
    setBusy(false);
    finish(result);
  };

  const handleDemo = async () => {
    setBusy(true);
    setErrors({});
    const result = await signInAsDemo();
    setBusy(false);
    finish(result);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-body text-ink-secondary">
            Welcome back. Your places and plans are right where you left them.
          </p>
        </div>
        <Link to="/register" className={`${LINK_QUIET} pt-2`}>
          Create an account
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <CardHeader title="Use your account" meta="Stored in this browser" />

            {errors.form ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-card border border-danger/25 bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                <AlertTriangle size={15} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
                <span>{errors.form}</span>
              </div>
            ) : null}

            <Field label="Email" htmlFor="signin-email" error={errors.email}>
              <TextInput
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={update('email')}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password" htmlFor="signin-password" error={errors.password}>
              <TextInput
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={update('password')}
                placeholder="Your password"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" variant="primary" icon={LogIn} disabled={!complete || busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
              <Button variant="secondary" icon={UserPlus} onClick={handleDemo} disabled={busy}>
                Log in with demo account
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <CardHeader title="Demo account" meta="Published on purpose for this prototype" />
            <div className="rounded-control border border-line bg-sunken px-3 py-2">
              <div className="divide-y divide-line">
                <KeyValue label="Email">{DEMO_CREDENTIALS.email}</KeyValue>
                <KeyValue label="Password">{DEMO_CREDENTIALS.password}</KeyValue>
              </div>
            </div>
            <p className="text-label text-ink-secondary">
              The demo account already holds the sample trip “Weekend in Chiang Mai”, its itinerary, packing list and
              expenses.
            </p>
            <FinePrint>Published demo credentials · prototype only</FinePrint>
          </Card>

          <Notice tone="warning" icon={AlertTriangle}>
            This is a local prototype. Your account and plans stay in this browser and do not sync between devices.
            Anyone using this browser profile can access stored records. Use a demo password you do not use elsewhere.
          </Notice>
        </div>
      </div>
    </div>
  );
}
