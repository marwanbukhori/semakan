import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@govtechmy/myds-react/breadcrumb';
import { Button } from '@govtechmy/myds-react/button';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useParams } from 'react-router';
import { ApiError } from '@/shared/api/ApiError';
import { LoadError } from '@/shared/ui/LoadError';
import { useApplication } from '../api/queries';
import { ApplicationFacts } from '../components/ApplicationFacts';
import { DetailLoading, DetailNotFound } from '../components/DetailStates';
import { DocumentList } from '../components/DocumentList';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { isReviewable } from '../rules';

export function Component() {
  const { t } = useTranslation();
  const { id = '' } = useParams<'id'>();
  const { data, error, isPending, isError, refetch } = useApplication(id);

  // Only replace the page when there is nothing to show. A failed background refetch
  // (e.g. after a failed review) keeps the last good data and the open dialog on screen.
  if (data === undefined) {
    if (isPending) return <DetailLoading />;
    if (isError && error instanceof ApiError && error.status === 404) return <DetailNotFound />;
    return (
      <LoadError
        title={t('applications.detail.loadErrorTitle')}
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <article aria-labelledby="application-heading" className="flex flex-col gap-6">
      <Breadcrumb aria-label={t('applications.detail.breadcrumbLabel')}>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/applications">{t('applications.detail.breadcrumb')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{data.referenceNo}</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1
            id="application-heading"
            // Focus lands here when the review dialog closes and there is no Review link.
            tabIndex={-1}
            className="font-heading text-heading-xs font-semibold focus:outline-none"
          >
            {data.referenceNo}
          </h1>
          <StatusBadge status={data.status} />
        </div>
        {isReviewable(data.status) ? (
          <Button asChild variant="primary-fill" size="medium">
            <Link id="review-link" to="review">
              {t('applications.detail.review')}
            </Link>
          </Button>
        ) : (
          <p className="text-body-sm text-txt-black-500">{t('applications.detail.closed')}</p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <ApplicationFacts application={data} />
          <section aria-labelledby="documents-heading">
            <h2 id="documents-heading" className="mb-2 font-heading text-body-lg font-semibold">
              {t('applications.detail.sections.documents')}
            </h2>
            <DocumentList documents={data.documents} />
          </section>
        </div>
        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="mb-3 font-heading text-body-lg font-semibold">
            {t('applications.detail.sections.timeline')}
          </h2>
          <Timeline events={data.timeline} />
        </section>
      </div>

      {/* The review dialog renders here, so it sits over this page and has its own URL. */}
      <Outlet />
    </article>
  );
}
