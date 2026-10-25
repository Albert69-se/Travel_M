/**
 * Trip overview — the one screen that answers "where does this trip stand?".
 *
 * All figures come from the layout's outlet context, which reads them from
 * `useTripData`; nothing here re-implements budget maths or day grouping.
 */
import { Link, useOutletContext } from 'react-router-dom';
import { AlertTriangle, Backpack, CloudSun, Receipt, Route } from 'lucide-react';

import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  FinePrint,
  KeyValue,
  Notice,
  ProgressBar,
  Stat,
} from '../components/ui.jsx';
import {
  categoryColour,
  countdownLabel,
  dateRange,
  dayCountLabel,
  money,
  percentage,
  weekdayDate,
} from '../lib/format.js';
import { todayIsoDate } from '../../core/utils.js';

/** `budget.level` sets the progress tone; the level is always also stated in text. */
const BUDGET_TONE = { ok: 'accent', nearing: 'warning', over: 'danger', unknown: 'accent' };

const OTHER_TABS = [
  { segment: 'itinerary', label: 'Itinerary', icon: Route },
  { segment: 'packing', label: 'Packing', icon: Backpack },
  { segment: 'expenses', label: 'Expenses', icon: Receipt },
  { segment: 'weather', label: 'Weather', icon: CloudSun },
];

export default function TripOverviewView() {
  const {
    trip,
    activities,
    activityGroups,
    packingCounts,
    expenses,
    spent,
    remaining,
    budget,
    categoryTotals,
    days,
  } = useOutletContext();

  const today = todayIsoDate();
  const upcoming = activities.filter((activity) => activity.date >= today).slice(0, 4);
  const tone = BUDGET_TONE[budget.level] || 'accent';
  const percentLabel = `${budget.percentSpent}% of the planned budget spent`;
  const packingComplete = packingCounts.total > 0 && packingCounts.packed === packingCounts.total;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: where this trip is, and what it costs. */}
      <Card className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <FinePrint>Destination</FinePrint>
          <h2 className="text-section font-semibold text-ink break-words">{trip.destinationLabel}</h2>
          <p className="text-base text-ink-secondary tm-numeric">
            {dateRange(trip.startDate, trip.endDate)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{dayCountLabel(trip)}</Badge>
            <Badge tone="neutral">{countdownLabel(trip.startDate)}</Badge>
          </div>
          <p className="text-label text-ink-tertiary tm-numeric">
            {days.length} {days.length === 1 ? 'day' : 'days'} in range · {activityGroups.length}{' '}
            {activityGroups.length === 1 ? 'day' : 'days'} with activities
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-canvas p-3">
          <p className="text-micro font-semibold uppercase text-ink-tertiary">Budget</p>
          <KeyValue label="Planned">{money(trip.expectedBudget, trip.currencyCode)}</KeyValue>
          <KeyValue label="Spent">{money(spent, trip.currencyCode)}</KeyValue>
          <KeyValue label="Remaining">{money(remaining, trip.currencyCode)}</KeyValue>
          <ProgressBar value={budget.percentSpent} max={100} tone={tone} label={percentLabel} />
          <p className="text-label text-ink-secondary tm-numeric">
            {percentLabel} · {budget.label}
          </p>
        </div>
      </Card>

      {budget.level === 'nearing' || budget.level === 'over' ? (
        <Notice tone="warning" icon={AlertTriangle}>
          <span className="font-medium">{budget.label}.</span> {budget.message}
        </Notice>
      ) : null}

      {/* Headline figures. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Planned budget"
          value={money(trip.expectedBudget, trip.currencyCode)}
          hint="Set on the trip record"
        />
        <Stat
          label="Spent"
          value={money(spent, trip.currencyCode)}
          tone={budget.level === 'over' ? 'danger' : 'default'}
          progress={{ value: budget.percentSpent, max: 100, tone, label: percentLabel }}
          hint={`${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} recorded`}
        />
        <Stat
          label="Remaining"
          value={money(remaining, trip.currencyCode)}
          tone={remaining < 0 ? 'danger' : 'success'}
          hint={remaining < 0 ? 'Over the planned budget' : 'Still available'}
        />
        <Stat
          label="Activities"
          value={String(activities.length)}
          hint={
            activityGroups.length === 0
              ? 'Nothing planned yet'
              : `${activityGroups.length} of ${days.length} days planned`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Left: what happens next. */}
        <Card padded={false}>
          <div className="p-4">
            <CardHeader
              title="Upcoming plan"
              meta={
                upcoming.length === 0
                  ? 'Nothing scheduled from today onwards'
                  : `${upcoming.length} next from ${activities.length} planned`
              }
              action={
                <Link
                  to={`/trips/${trip.id}/itinerary`}
                  className="tm-focus shrink-0 rounded-control text-body font-medium text-accent hover:underline"
                >
                  View itinerary
                </Link>
              }
            />
          </div>

          {upcoming.length === 0 ? (
            <div className="border-t border-line">
              <EmptyState
                icon={Route}
                title="No upcoming activities"
                description="Every activity on this trip is in the past, or none has been added yet. Open the itinerary to plan a day."
              />
            </div>
          ) : (
            <ul className="tm-scroll max-h-[560px] overflow-y-auto border-t border-line">
              {upcoming.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-start justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-label text-ink-tertiary tm-numeric">{weekdayDate(activity.date)}</p>
                    <p className="text-body font-medium text-ink break-words">{activity.title}</p>
                    {activity.notes ? (
                      <p className="mt-0.5 text-label text-ink-secondary break-words">{activity.notes}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-body font-medium text-ink tm-numeric">
                    {money(activity.estimatedCost, trip.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Right: packing, spending split, and the other tabs. */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <CardHeader
              title="Packing"
              meta={`${packingCounts.packed} of ${packingCounts.total} packed`}
              action={
                <Link
                  to={`/trips/${trip.id}/packing`}
                  className="tm-focus shrink-0 rounded-control text-body font-medium text-accent hover:underline"
                >
                  Open
                </Link>
              }
            />
            {packingCounts.total === 0 ? (
              <p className="text-label text-ink-secondary">No packing items yet.</p>
            ) : (
              <>
                <ProgressBar
                  value={packingCounts.packed}
                  max={packingCounts.total}
                  tone={packingComplete ? 'success' : 'accent'}
                  label={`${packingCounts.packed} of ${packingCounts.total} items packed`}
                />
                <p className="text-label text-ink-secondary tm-numeric">
                  {packingComplete ? 'Everything on the list is packed.' : `${packingCounts.remaining} still to pack.`}
                </p>
              </>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHeader title="Spending by category" meta={`${expenses.length} recorded`} />
            {categoryTotals.length === 0 ? (
              <p className="text-label text-ink-secondary">No expenses recorded yet.</p>
            ) : (
              <ul className="flex flex-col">
                {categoryTotals.map((entry) => (
                  <li
                    key={entry.category}
                    className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`size-2 shrink-0 rounded-chip ${categoryColour(entry.category)}`}
                        aria-hidden="true"
                      />
                      <span className="truncate text-body text-ink">{entry.category}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 tm-numeric">
                      <span className="text-body font-medium text-ink">
                        {money(entry.amount, trip.currencyCode)}
                      </span>
                      <span className="text-label text-ink-tertiary">
                        {percentage(entry.amount, spent)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <CardHeader title="Go to" meta="The rest of this trip" />
            <div className="flex flex-col gap-1">
              {OTHER_TABS.map((tab) => (
                <Link
                  key={tab.segment}
                  to={`/trips/${trip.id}/${tab.segment}`}
                  className="tm-focus flex h-[34px] items-center gap-2 rounded-control px-2 text-body font-medium text-ink-secondary hover:bg-canvas hover:text-ink"
                >
                  <tab.icon size={15} strokeWidth={1.75} aria-hidden="true" />
                  {tab.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <FinePrint>Sample data — not verified. Budget and expense figures come from the records stored for this trip.</FinePrint>
    </div>
  );
}
