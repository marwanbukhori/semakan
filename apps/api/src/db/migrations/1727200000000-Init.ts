import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1727200000000 implements MigrationInterface {
  name = 'Init1727200000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
CREATE TABLE applications (
  id text PRIMARY KEY,
  reference_no text NOT NULL UNIQUE,
  applicant_name text NOT NULL,
  applicant_id_number text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text NOT NULL,
  business_name text NOT NULL,
  business_address text NOT NULL,
  premises_category text NOT NULL CHECK (premises_category IN ('food_beverage','retail','services','workshop','entertainment')),
  state text NOT NULL,
  submitted_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted','under_review','info_requested','approved','rejected')),
  assigned_officer_name text,
  version integer NOT NULL CHECK (version >= 1)
);
CREATE INDEX applications_status_submitted_at_idx ON applications (status, submitted_at DESC, reference_no);
CREATE INDEX applications_submitted_at_idx ON applications (submitted_at DESC, reference_no);
CREATE TABLE documents (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ssm_certificate','premises_photo','floor_plan','fire_certificate')),
  file_name text NOT NULL,
  size_kb integer NOT NULL CHECK (size_kb > 0),
  UNIQUE (application_id, position)
);
CREATE TABLE timeline_events (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('submitted','status_changed','info_requested','comment')),
  at timestamptz NOT NULL,
  actor text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (application_id, seq)
);
CREATE TABLE idempotency_keys (
  key text PRIMARY KEY,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE idempotency_keys, timeline_events, documents, applications`);
  }
}
