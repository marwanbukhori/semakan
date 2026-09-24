import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'documents' })
export class DocumentEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text', { name: 'application_id' }) applicationId!: string;
  @Column('int') position!: number;
  @Column('text') kind!: string;
  @Column('text', { name: 'file_name' }) fileName!: string;
  @Column('int', { name: 'size_kb' }) sizeKb!: number;
}
