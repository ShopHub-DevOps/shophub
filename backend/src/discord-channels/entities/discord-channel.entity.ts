import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  DiscordChannelPhase,
  DiscordSeverity,
} from '../../k8s/discord-channel-cr.types';

@Entity({ name: 'discord_channels' })
@Check(
  'chk_discord_channels_min_severity',
  `"min_severity" IN ('info', 'warning', 'critical')`,
)
@Index('uniq_discord_channels_k8s_name', ['k8sName'], { unique: true })
@Index('uniq_discord_channels_secret_name', ['secretName'], { unique: true })
@Index('idx_discord_channels_user_id', ['userId'])
@Index('idx_discord_channels_shop_id', ['shopId'])
export class DiscordChannel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /**
   * Nullable. When set, the channel is scoped to a single Shop owned by the
   * same user. Foreign key to shops(id) with ON DELETE SET NULL so deleting
   * a Shop does not orphan the DiscordChannel; the channel reverts to an
   * all-shops-in-namespace receiver.
   */
  @Column({ name: 'shop_id', type: 'uuid', nullable: true })
  shopId!: string | null;

  /**
   * Auto-generated DNS-1123 label used as the DiscordChannel CR's metadata.name.
   * Immutable after creation; users never see it directly.
   */
  @Column({ name: 'k8s_name', type: 'varchar', length: 63 })
  k8sName!: string;

  /**
   * Name of the Kubernetes Secret holding the webhook URL under key `url`.
   * Lives in the same tenant namespace as the CR.
   */
  @Column({ name: 'secret_name', type: 'varchar', length: 63 })
  secretName!: string;

  @Column({ name: 'channel_name', type: 'varchar', length: 80 })
  channelName!: string;

  @Column({ name: 'min_severity', type: 'varchar', length: 16 })
  minSeverity!: DiscordSeverity;

  @Column({ name: 'last_known_phase', type: 'varchar', length: 16, nullable: true })
  lastKnownPhase!: DiscordChannelPhase | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
