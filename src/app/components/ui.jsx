/**
 * Presentation primitives for the Travel M design system.
 *
 * Every control here is a plain element carrying design-system classes rather
 * than a component library, so the tokens in `styles/index.css` stay the single
 * place where geometry, colour and type are decided.
 */
import { cloneElement, isValidElement } from 'react';
import { ChevronDown, Inbox } from 'lucide-react';

/* ------------------------------------------------------------------- layout */

export function Card({ as: Tag = 'div', className = '', padded = true, children, ...rest }) {
  return (
    <Tag className={`tm-card ${padded ? 'p-4' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, meta, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-card-title font-semibold text-ink break-words">{title}</h2>
        {meta ? <p className="mt-0.5 text-label text-ink-tertiary tm-numeric">{meta}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className = '' }) {
  return <div className={`h-px bg-line ${className}`} role="presentation" />;
}

/** A dense list row: hairline separated, with the divider suppressed on the last. */
export function Row({ className = '', children, ...rest }) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ controls */

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-active',
  secondary: 'bg-surface text-ink border border-line hover:bg-canvas hover:border-line-strong',
  ghost: 'bg-transparent text-ink-secondary hover:bg-canvas hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95',
  dangerOutline: 'bg-surface text-danger border border-line hover:bg-danger-bg',
};

const BUTTON_SIZES = {
  md: 'h-[44px] px-3 text-body',
  sm: 'h-[40px] px-2.5 text-label',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`tm-focus inline-flex items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon size={15} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children}
      {TrailingIcon ? <TrailingIcon size={15} strokeWidth={1.75} aria-hidden="true" /> : null}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = '', size = 44, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`tm-focus inline-flex shrink-0 items-center justify-center rounded-control text-ink-tertiary transition-colors hover:bg-canvas hover:text-ink ${className}`}
      style={{ width: Math.max(44, size), height: Math.max(44, size) }}
      {...rest}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

export function Chip({ selected = false, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`tm-focus inline-flex h-[44px] items-center rounded-chip border px-2.5 text-label font-medium transition-colors ${
        selected
          ? 'border-accent bg-tint text-accent'
          : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({ options, value, onChange, label, className = '' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex h-[44px] items-center gap-0.5 rounded-control border border-line bg-surface p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`tm-focus inline-flex h-[36px] items-center gap-1.5 rounded-[6px] px-2.5 text-label font-medium transition-colors ${
              active ? 'bg-tint text-accent' : 'text-ink-secondary hover:bg-canvas hover:text-ink'
            }`}
          >
            {option.icon ? <option.icon size={14} strokeWidth={1.75} aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const BADGE_TONES = {
  neutral: 'bg-canvas text-ink-secondary',
  accent: 'bg-tint text-accent',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex h-[20px] shrink-0 items-center rounded-chip px-2 text-micro font-medium uppercase ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, max = 100, tone = 'accent', label, className = '' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const fill = tone === 'warning' ? 'bg-warning' : tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-accent';
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-chip bg-tint ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full rounded-chip ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------------------------------------------------------------------- data */

export function Stat({ label, value, hint, tone = 'default', progress = null, className = '' }) {
  const valueTone =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-ink';
  return (
    <Card className={`flex flex-col justify-between gap-2 ${className}`}>
      <p className="text-micro font-semibold uppercase text-ink-tertiary">{label}</p>
      <div>
        <p className={`text-metric font-semibold tm-numeric ${valueTone}`}>{value}</p>
        {progress ? (
          <ProgressBar value={progress.value} max={progress.max} tone={progress.tone} label={progress.label} className="mt-2" />
        ) : null}
        {hint ? <p className="mt-1 text-label text-ink-tertiary tm-numeric">{hint}</p> : null}
      </div>
    </Card>
  );
}

export function KeyValue({ label, children, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${className}`}>
      <span className="shrink-0 text-label text-ink-tertiary">{label}</span>
      <span className="min-w-0 break-words text-body font-medium text-ink tm-numeric text-right">{children}</span>
    </div>
  );
}

/* --------------------------------------------------------------------- forms */

export function Field({ label, htmlFor, error, hint, className = '', children }) {
  const descriptionId = htmlFor && (error || hint) ? `${htmlFor}-description` : undefined;
  const control = isValidElement(children) ? cloneElement(children, {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [children.props['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined,
  }) : children;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label ? (
        <label htmlFor={htmlFor} className="text-label font-medium text-ink-secondary">
          {label}
        </label>
      ) : null}
      {control}
      {error ? (
        <p id={descriptionId} className="text-label text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-label text-ink-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL_CLASS =
  'tm-focus h-[44px] w-full rounded-control border border-line bg-surface px-2.5 text-body text-ink transition-colors hover:border-line-strong disabled:bg-canvas disabled:text-ink-tertiary';

export function TextInput({ className = '', ...rest }) {
  return <input className={`${CONTROL_CLASS} ${className}`} {...rest} />;
}

export function TextArea({ className = '', rows = 3, ...rest }) {
  return <textarea rows={rows} className={`${CONTROL_CLASS} h-auto py-2 ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <div className={`relative ${className}`}>
      <select className={`${CONTROL_CLASS} appearance-none pr-8`} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
      />
    </div>
  );
}

export function Checkbox({ label, className = '', ...rest }) {
  return (
    <label className={`inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-2 ${className}`}>
      <input
        type="checkbox"
        className="tm-focus size-4 shrink-0 cursor-pointer rounded-[4px] border-line accent-accent"
        {...rest}
      />
      {label ? <span className="text-body text-ink">{label}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ feedback */

const NOTICE_TONES = {
  info: 'border-line bg-canvas text-ink-secondary',
  warning: 'border-warning/25 bg-warning-bg text-warning',
  danger: 'border-danger/25 bg-danger-bg text-danger',
  accent: 'border-accent/20 bg-tint text-accent',
};

export function Notice({ tone = 'info', icon: Icon, children, className = '' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-card border px-3 py-2.5 text-label ${NOTICE_TONES[tone]} ${className}`}>
      {Icon ? <Icon size={15} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" /> : null}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-10 text-center ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-chip bg-canvas text-ink-tertiary">
        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <p className="text-card-title font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-md text-label text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Provenance and limitation notes must be readable, so they get their own slot. */
export function FinePrint({ children, className = '' }) {
  return <p className={`text-micro uppercase text-ink-tertiary ${className}`}>{children}</p>;
}
