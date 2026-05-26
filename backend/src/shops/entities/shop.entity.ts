import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AvailabilityTier,
  DatabaseTier,
  ShopPhase,
} from '../../k8s/shop-cr.types';

@Entity({ name: 'shops' })
@Check(
  'chk_shops_availability',
  `"availability" IN ('standard', 'high')`,
)
@Check(
  'chk_shops_database_tier',
  `"database_tier" IN ('standard', 'light')`,
)
@Index('uniq_shops_k8s_name', ['k8sName'], { unique: true })
@Index('uniq_shops_host', ['host'], { unique: true })
@Index('idx_shops_user_id', ['userId'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /**
   * Auto-generated DNS-1123 label used as the Shop CR's metadata.name.
   * Immutable after creation; users never see it directly.
   */
  @Column({ name: 'k8s_name', type: 'varchar', length: 63 })
  k8sName!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 80 })
  displayName!: string;

  @Column({ type: 'varchar', length: 253 })
  host!: string;

  @Column({ type: 'varchar', length: 16 })
  availability!: AvailabilityTier;

  @Column({ name: 'database_tier', type: 'varchar', length: 16 })
  databaseTier!: DatabaseTier;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42 })
  walletAddress!: string;

  @Column({ name: 'chain_id', type: 'bigint', default: 11155111 })
  chainId!: string;

  @Column({ name: 'backend_image', type: 'varchar', length: 255, nullable: true })
  backendImage!: string | null;

  @Column({ name: 'frontend_image', type: 'varchar', length: 255, nullable: true })
  frontendImage!: string | null;

  @Column({ name: 'last_known_phase', type: 'varchar', length: 16, nullable: true })
  lastKnownPhase!: ShopPhase | null;

  @Column({ name: 'last_known_url', type: 'varchar', length: 512, nullable: true })
  lastKnownUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalize(): void {
    if (this.walletAddress) {
      this.walletAddress = this.walletAddress.toLowerCase();
    }
    if (this.host) {
      this.host = this.host.toLowerCase();
    }
    if (this.k8sName) {
      this.k8sName = this.k8sName.toLowerCase();
    }
  }
}
