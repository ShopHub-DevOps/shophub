import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { DataSource } from 'typeorm';

/**
 * Standalone TypeORM DataSource consumed by the typeorm CLI for
 * migration commands (migration:run, migration:revert, migration:generate).
 *
 * Loads .env from backend/.env first, then falls back to repo-root .env,
 * matching the lookup ConfigModule does at runtime.
 */
loadDotenv({ path: '.env' });
loadDotenv({ path: '../.env' });

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'shophub_migrations',
});

export default dataSource;
