import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAuth1716635000000 implements MigrationInterface {
  name = 'InitAuth1716635000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255),
        "password_hash" varchar(255),
        "wallet_address" varchar(42),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_users_auth_method"
          CHECK ("email" IS NOT NULL OR "wallet_address" IS NOT NULL),
        CONSTRAINT "chk_users_email_password_paired"
          CHECK (("email" IS NULL) = ("password_hash" IS NULL))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_users_email" ON "users" ("email") WHERE "email" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_users_wallet_address" ON "users" ("wallet_address") WHERE "wallet_address" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_users_wallet_address"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
