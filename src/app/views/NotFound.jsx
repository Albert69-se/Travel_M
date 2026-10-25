/**
 * Not found. A compact dead end that points back at the two places worth going:
 * the dashboard and the place list.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Home } from 'lucide-react';

import { Card, EmptyState, FinePrint } from '../components/ui.jsx';

const LINK_PRIMARY =
  'tm-focus inline-flex h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-control bg-accent px-3 text-body font-medium text-white transition-colors hover:bg-accent-hover';
const LINK_SECONDARY =
  'tm-focus inline-flex h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface px-3 text-body font-medium text-ink transition-colors hover:border-line-strong';

export default function NotFoundView() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <Card>
        <EmptyState
          icon={Compass}
          title="That page does not exist"
          description="The link may be out of date, or the record it pointed at has been deleted. Nothing on this page changed your stored records."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/" className={LINK_PRIMARY}>
                <Home size={15} strokeWidth={1.75} aria-hidden="true" />
                Go to Home
              </Link>
              <Link to="/discover" className={LINK_SECONDARY}>
                Browse places
                <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          }
        />
      </Card>

      <FinePrint className="text-center">Prototype · records not field-verified</FinePrint>
    </div>
  );
}
