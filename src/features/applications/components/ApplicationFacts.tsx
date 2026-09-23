import {
  SummaryList,
  SummaryListBody,
  SummaryListDetail,
  SummaryListRow,
  SummaryListTerm,
} from '@govtechmy/myds-react/summary-list';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib/format';
import type { ApplicationDetail } from '../types';

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    // MYDS gives the term a 190px minimum width and the detail no wrapping, which
    // overflows a 360px screen. Below `sm` the term stacks above its detail, and
    // long values (emails, addresses) wrap anywhere. MYDS merges these classes
    // with tailwind-merge, so `min-w-0` replaces its `min-w-[190px]`.
    <SummaryListRow className="flex flex-col sm:table-row">
      <SummaryListTerm className="min-w-0 pb-0 sm:min-w-[190px] sm:pb-3">{term}</SummaryListTerm>
      <SummaryListDetail className="pt-1 [overflow-wrap:anywhere] sm:table-cell sm:pt-3">
        {children}
      </SummaryListDetail>
    </SummaryListRow>
  );
}

function FactsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 font-heading text-body-lg font-semibold">
        {title}
      </h2>
      <SummaryList>
        <SummaryListBody>{children}</SummaryListBody>
      </SummaryList>
    </section>
  );
}

export function ApplicationFacts({ application }: { application: ApplicationDetail }) {
  const { t, i18n } = useTranslation();
  const field = (name: keyof typeof fieldKeys) => t(fieldKeys[name]);

  return (
    <>
      <FactsSection id="applicant-heading" title={t('applications.detail.sections.applicant')}>
        <Fact term={field('name')}>{application.applicantName}</Fact>
        <Fact term={field('idNumber')}>{application.applicantIdNumber}</Fact>
        <Fact term={field('email')}>{application.applicantEmail}</Fact>
        <Fact term={field('phone')}>{application.applicantPhone}</Fact>
      </FactsSection>
      <FactsSection id="business-heading" title={t('applications.detail.sections.business')}>
        <Fact term={field('businessName')}>{application.businessName}</Fact>
        <Fact term={field('address')}>{application.businessAddress}</Fact>
        <Fact term={field('category')}>{t(`category.${application.premisesCategory}`)}</Fact>
        <Fact term={field('state')}>{application.state}</Fact>
        <Fact term={field('submittedAt')}>
          {formatDate(application.submittedAt, i18n.language)}
        </Fact>
        <Fact term={field('officer')}>
          {application.assignedOfficerName ?? t('applications.detail.unassigned')}
        </Fact>
      </FactsSection>
    </>
  );
}

const fieldKeys = {
  name: 'applications.detail.fields.name',
  idNumber: 'applications.detail.fields.idNumber',
  email: 'applications.detail.fields.email',
  phone: 'applications.detail.fields.phone',
  businessName: 'applications.detail.fields.businessName',
  address: 'applications.detail.fields.address',
  category: 'applications.detail.fields.category',
  state: 'applications.detail.fields.state',
  submittedAt: 'applications.detail.fields.submittedAt',
  officer: 'applications.detail.fields.officer',
} as const;
