import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { WalletCRClient } from '../k8s/wallet-cr.client';
import { Wallet } from './entities/wallet.entity';
import { walletEntityToCRSpec } from './wallets.mapper';

const PG_UNIQUE_VIOLATION = '23505';
const DEFAULT_PURPOSE = 'payments';
const DEFAULT_CHAIN_ID = 11155111;

export interface CreateWalletInput {
  displayName: string;
  address: string;
  chainId?: number;
  purpose?: 'payments' | 'payout';
}

export interface UpdateWalletInput {
  displayName?: string;
  purpose?: 'payments' | 'payout';
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    private readonly k8s: WalletCRClient,
  ) {}

  async createForUser(userId: string, input: CreateWalletInput): Promise<Wallet> {
    const wallet = this.wallets.create({
      userId,
      k8sName: generateWalletK8sName(),
      displayName: input.displayName,
      address: input.address,
      chainId: String(input.chainId ?? DEFAULT_CHAIN_ID),
      purpose: input.purpose ?? DEFAULT_PURPOSE,
    });

    let saved: Wallet;
    try {
      saved = await this.wallets.save(wallet);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Wallet name collision; please retry');
      }
      throw err;
    }

    try {
      await this.k8s.create(saved.k8sName, walletEntityToCRSpec(saved));
    } catch (err) {
      this.logger.error(
        `Failed to create Wallet CR ${saved.k8sName}, rolling back DB row`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.wallets.delete(saved.id);
      throw err;
    }
    return saved;
  }

  findAllForUser(userId: string): Promise<Wallet[]> {
    return this.wallets.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.wallets.findOne({ where: { id, userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async updateForUser(
    userId: string,
    id: string,
    input: UpdateWalletInput,
  ): Promise<Wallet> {
    const wallet = await this.findOneForUser(userId, id);

    if (input.displayName !== undefined) wallet.displayName = input.displayName;
    if (input.purpose !== undefined) wallet.purpose = input.purpose;

    const saved = await this.wallets.save(wallet);
    await this.k8s.patchSpec(saved.k8sName, walletEntityToCRSpec(saved));
    return saved;
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    const wallet = await this.findOneForUser(userId, id);
    await this.k8s.delete(wallet.k8sName);
    await this.wallets.delete(wallet.id);
  }

  /**
   * Sweeps every Wallet row and copies the latest phase from its CR status
   * into the DB. Intended to be called from a scheduled job.
   */
  async syncAllStatuses(): Promise<void> {
    if (!this.k8s.isReady()) {
      return;
    }
    const wallets = await this.wallets.find();
    for (const wallet of wallets) {
      try {
        const cr = await this.k8s.get(wallet.k8sName);
        if (!cr) {
          continue;
        }
        const phase = cr.status?.phase ?? null;
        if (phase !== wallet.lastKnownPhase) {
          wallet.lastKnownPhase = phase;
          await this.wallets.save(wallet);
        }
      } catch (err) {
        this.logger.warn(
          `Status sync failed for wallet ${wallet.k8sName}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}

function generateWalletK8sName(): string {
  return `wallet-${randomBytes(4).toString('hex')}`;
}
