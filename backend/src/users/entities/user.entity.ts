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

@Entity({ name: 'users' })
@Check(
  'chk_users_auth_method',
  `"email" IS NOT NULL OR "wallet_address" IS NOT NULL`,
)
@Check(
  'chk_users_email_password_paired',
  `("email" IS NULL) = ("password_hash" IS NULL)`,
)
@Index('uniq_users_email', ['email'], {
  unique: true,
  where: '"email" IS NOT NULL',
})
@Index('uniq_users_wallet_address', ['walletAddress'], {
  unique: true,
  where: '"wallet_address" IS NOT NULL',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash!: string | null;

  @Column({
    name: 'wallet_address',
    type: 'varchar',
    length: 42,
    nullable: true,
  })
  walletAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalize(): void {
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }
    if (this.walletAddress) {
      this.walletAddress = this.walletAddress.toLowerCase();
    }
  }
}
