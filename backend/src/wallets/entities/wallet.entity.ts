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
import type { WalletPhase, WalletPurpose } from '../../k8s/wallet-cr.types';

@Entity({ name: 'wallets' })
@Check('chk_wallets_purpose', `"purpose" IN ('payments', 'payout')`)
@Index('uniq_wallets_k8s_name', ['k8sName'], { unique: true })
@Index('idx_wallets_user_id', ['userId'])
@Index('idx_wallets_address', ['address'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /**
   * Auto-generated DNS-1123 label used as the Wallet CR's metadata.name.
   * Immutable after creation; users never see it directly.
   */
  @Column({ name: 'k8s_name', type: 'varchar', length: 63 })
  k8sName!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 80 })
  displayName!: string;

  @Column({ type: 'varchar', length: 42 })
  address!: string;

  @Column({ name: 'chain_id', type: 'bigint', default: 11155111 })
  chainId!: string;

  @Column({ type: 'varchar', length: 16 })
  purpose!: WalletPurpose;

  @Column({ name: 'last_known_phase', type: 'varchar', length: 16, nullable: true })
  lastKnownPhase!: WalletPhase | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalize(): void {
    if (this.address) {
      this.address = this.address.toLowerCase();
    }
    if (this.k8sName) {
      this.k8sName = this.k8sName.toLowerCase();
    }
  }
}
