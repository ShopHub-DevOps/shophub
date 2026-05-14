import { DynamicModule, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Wraps the TypeORM connection for the platform database. When the
 * DATABASE_URL environment variable is missing, the module mounts in
 * no-op mode and emits a single warning at boot. This lets the rest of
 * the application (unit tests, e2e tests, local smoke runs) start
 * without requiring a live Postgres instance. Feature modules that
 * actually need persistence depend on this module via TypeOrmModule.forFeature
 * and will fail loudly if no connection is configured.
 */
@Module({})
export class DatabaseModule {
  private static readonly logger = new Logger(DatabaseModule.name);

  static register(): DynamicModule {
    const url = process.env.DATABASE_URL;
    if (!url) {
      DatabaseModule.logger.warn(
        'DATABASE_URL is not set; DatabaseModule mounted in no-op mode',
      );
      return { module: DatabaseModule };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url,
          entities: [__dirname + '/../**/*.entity.{ts,js}'],
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: false,
          migrationsTableName: 'shophub_migrations',
          logging: process.env.DB_LOGGING === 'true',
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
