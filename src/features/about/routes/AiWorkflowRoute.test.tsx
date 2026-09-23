import { act, screen, within } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { renderRoutes } from '@/test/render';
import { aiWorkflow } from '../content/aiWorkflow';
import { Component as AiWorkflowRoute } from './AiWorkflowRoute';

const routes = [{ path: '/about/ai-workflow', Component: AiWorkflowRoute }];

describe('AiWorkflowRoute', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  it('shows the title as the h1', () => {
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    expect(screen.getByRole('heading', { level: 1, name: 'AI workflow' })).toBeInTheDocument();
  });

  it('shows the pipeline as an ordered list of 8 steps', () => {
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    const list = screen.getByRole('list', { name: 'How it was built' });
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(
      aiWorkflow.pipeline.map((step) => step.title.en),
    );
  });

  it('shows the ownership table with two column headers', () => {
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    const table = screen.getByRole('table', { name: 'Who does what' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers.map((header) => header.textContent)).toEqual(['What I own', 'What the AI does']);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
    expect(within(table).getByText('Every ruling on a conflict')).toBeInTheDocument();
    expect(within(table).getByText('Reviews each task against the plan')).toBeInTheDocument();
  });

  it('shows 7 incidents, each with at least one link', () => {
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    const list = screen.getByRole('list', { name: 'Caught by review' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    for (const item of items) {
      expect(within(item).getAllByRole('link').length).toBeGreaterThan(0);
    }
  });

  it('links each incident commit to the right GitHub commit URL', () => {
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    const firstIncident = screen.getByRole('heading', { name: 'A quiet API swap' }).closest('li')!;
    const commitLink = within(firstIncident).getByRole('link', { name: 'Commit f435834' });
    expect(commitLink).toHaveAttribute(
      'href',
      'https://github.com/marwanbukhori/semakan/commit/f435834',
    );
  });

  it('shows the numbers, matching the content', () => {
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    const table = screen.getByRole('table', { name: 'By the numbers' });
    const plan1Row = within(table).getByRole('rowheader', { name: 'Plan 1' }).closest('tr')!;
    expect(within(plan1Row).getByRole('gridcell', { name: '11' })).toBeInTheDocument();
    expect(within(plan1Row).getByRole('gridcell', { name: '2' })).toBeInTheDocument();
    expect(within(plan1Row).getByRole('gridcell', { name: '19' })).toBeInTheDocument();

    const totalRow = within(table).getByRole('rowheader', { name: 'Total' }).closest('tr')!;
    expect(within(totalRow).getByRole('gridcell', { name: '29' })).toBeInTheDocument();
    expect(within(totalRow).getByRole('gridcell', { name: '10' })).toBeInTheDocument();
    expect(within(totalRow).getByRole('gridcell', { name: '45' })).toBeInTheDocument();
  });

  it('shows the Malay title when the language is Malay', async () => {
    await act(() => i18n.changeLanguage('ms'));
    renderRoutes(routes, { initialEntries: ['/about/ai-workflow'] });

    expect(screen.getByRole('heading', { level: 1, name: 'Aliran kerja AI' })).toBeInTheDocument();
  });
});
