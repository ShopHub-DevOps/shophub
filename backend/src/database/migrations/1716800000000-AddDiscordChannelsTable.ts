import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscordChannelsTable1716800000000 implements MigrationInterface {
  name = 'AddDiscordChannelsTable1716800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "discord_channels" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "shop_id" uuid REFERENCES "shops"("id") ON DELETE SET NULL,
        "k8s_name" varchar(63) NOT NULL,
        "secret_name" varchar(63) NOT NULL,
        "channel_name" varchar(80) NOT NULL,
        "min_severity" varchar(16) NOT NULL,
        "last_known_phase" varchar(16),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_discord_channels_min_severity"
          CHECK ("min_severity" IN ('info', 'warning', 'critical'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_discord_channels_k8s_name" ON "discord_channels" ("k8s_name")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uniq_discord_channels_secret_name" ON "discord_channels" ("secret_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_discord_channels_user_id" ON "discord_channels" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_discord_channels_shop_id" ON "discord_channels" ("shop_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_discord_channels_shop_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_discord_channels_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_discord_channels_secret_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_discord_channels_k8s_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "discord_channels"`);
  }
}
