import { render, screen } from '@testing-library/react';
import type { TimelineEvent } from '../types';
import { Timeline } from './Timeline';

const at = '2026-09-20T09:00:00.000Z';
const events: TimelineEvent[] = [
  { id: 'e1', kind: 'submitted', at, actor: 'Tan Wei Jie' },
  {
    id: 'e2',
    kind: 'status_changed',
    at,
    actor: 'En. Kumar',
    from: 'submitted',
    to: 'under_review',
    note: null,
  },
  {
    id: 'e3',
    kind: 'info_requested',
    at,
    actor: 'En. Kumar',
    requestedInfo: ['floor_plan', 'fire_certificate'],
    note: 'Sila hantar dokumen.',
  },
  { id: 'e4', kind: 'comment', at, actor: 'Pn. Hafizah', note: 'Lawatan tapak selesai.' },
];

describe('Timeline', () => {
  it('describes every kind of event in order', () => {
    render(<Timeline events={events} />);
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Submitted by Tan Wei Jie');
    expect(items[1]).toHaveTextContent(
      'En. Kumar changed the status from Submitted to Under review',
    );
    expect(items[2]).toHaveTextContent('Requested: Floor plan, Fire safety certificate');
    expect(items[2]).toHaveTextContent('Sila hantar dokumen.');
    expect(items[3]).toHaveTextContent('Pn. Hafizah added a note');
  });

  it('marks up each timestamp as a machine-readable time', () => {
    const { container } = render(<Timeline events={events.slice(0, 1)} />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', at);
  });
});
