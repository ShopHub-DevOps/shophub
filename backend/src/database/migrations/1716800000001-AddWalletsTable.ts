import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletsTable1716800000001 implements MigrationInterface {
  name = 'AddWalletsTable1716800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "k8s_name" varchar(63) NOT NULL,
        "display_name" varchar(80) NOT NULL,
        "address" varchar(42) NOT NULL,
        "chain_id" bigint NOT NULL DEFAULT 11155111,
        "purpose" varchar(16) NOT NULL,
        "last_known_phase" varchar(16),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_wallets_purpose"
          CHECK ("purpose" IN ('payments', 'payout'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_wallets_k8s_name" ON "wallets" ("k8s_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wallets_user_id" ON "wallets" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wallets_address" ON "wallets" ("address")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallets_address"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallets_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_wallets_k8s_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
  }
}
