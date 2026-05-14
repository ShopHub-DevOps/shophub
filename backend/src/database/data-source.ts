import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Standalone TypeORM DataSource consumed by the typeorm CLI for
 * migration commands (migration:run, migration:revert, migration:generate).
 *
 * The runtime app reads the same DATABASE_URL value through its own
 * DatabaseModule, so the two paths stay in sync without sharing a
 * Nest-specific config helper.
 */
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'shophub_migrations',
});

export default dataSource;
