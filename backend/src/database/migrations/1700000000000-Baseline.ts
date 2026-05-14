import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration. Intentionally empty - it acts as a deterministic
 * anchor for future migrations so that 'migration:generate' has a
 * concrete starting point and 'migration:run' has at least one row to
 * write into shophub_migrations on a fresh database.
 */
export class Baseline1700000000000 implements MigrationInterface {
  name = 'Baseline1700000000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op baseline.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op baseline.
  }
}
