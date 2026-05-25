import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShopsTable1716700000000 implements MigrationInterface {
  name = 'AddShopsTable1716700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shops" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "k8s_name" varchar(63) NOT NULL,
        "display_name" varchar(80) NOT NULL,
        "host" varchar(253) NOT NULL,
        "availability" varchar(16) NOT NULL,
        "database_tier" varchar(16) NOT NULL,
        "wallet_address" varchar(42) NOT NULL,
        "chain_id" bigint NOT NULL DEFAULT 11155111,
        "backend_image" varchar(255),
        "frontend_image" varchar(255),
        "last_known_phase" varchar(16),
        "last_known_url" varchar(512),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_shops_availability"
          CHECK ("availability" IN ('standard', 'high')),
        CONSTRAINT "chk_shops_database_tier"
          CHECK ("database_tier" IN ('standard', 'light'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_shops_k8s_name" ON "shops" ("k8s_name")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_shops_host" ON "shops" ("host")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_shops_user_id" ON "shops" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shops_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_shops_host"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_shops_k8s_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shops"`);
  }
}
