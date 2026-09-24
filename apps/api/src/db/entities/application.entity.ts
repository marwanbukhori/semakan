import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'applications' })
export class ApplicationEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text', { name: 'reference_no' }) referenceNo!: string;
  @Column('text', { name: 'applicant_name' }) applicantName!: string;
  @Column('text', { name: 'applicant_id_number' }) applicantIdNumber!: string;
  @Column('text', { name: 'applicant_email' }) applicantEmail!: string;
  @Column('text', { name: 'applicant_phone' }) applicantPhone!: string;
  @Column('text', { name: 'business_name' }) businessName!: string;
  @Column('text', { name: 'business_address' }) businessAddress!: string;
  @Column('text', { name: 'premises_category' }) premisesCategory!: string;
  @Column('text') state!: string;
  @Column('timestamptz', { name: 'submitted_at' }) submittedAt!: Date;
  @Column('text') status!: string;
  @Column('text', { name: 'assigned_officer_name', nullable: true })
  assignedOfficerName!: string | null;
  // A plain column: saveReview checks it with an explicit WHERE, so @VersionColumn isn't needed.
  @Column('int') version!: number;
}
