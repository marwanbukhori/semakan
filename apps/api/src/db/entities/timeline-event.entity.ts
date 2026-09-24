import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The fields only some event kinds carry; the jsonb column holds whichever apply. */
export interface TimelineEventData {
  from?: string;
  to?: string;
  note?: string | null;
  requestedInfo?: string[];
}

@Entity({ name: 'timeline_events' })
export class TimelineEventEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text', { name: 'application_id' }) applicationId!: string;
  @Column('int') seq!: number;
  @Column('text') kind!: string;
  @Column('timestamptz') at!: Date;
  @Column('text') actor!: string;
  /** Each kind's own fields (from, to, note, requestedInfo); parsed back with TimelineEventSchema. */
  @Column('jsonb') data!: TimelineEventData;
}
