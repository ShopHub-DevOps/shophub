import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { ShopCRClient } from '../k8s/shop-cr.client';
import { ShopSpec } from '../k8s/shop-cr.types';
import { Shop } from './entities/shop.entity';
import { shopEntityToCRSpec } from './shops.mapper';

const PG_UNIQUE_VIOLATION = '23505';

export interface CreateShopInput {
  displayName: string;
  host: string;
  availability: ShopSpec['availability'];
  databaseTier: ShopSpec['databaseTier'];
  walletAddress: string;
  chainId?: number;
  backendImage?: string;
  frontendImage?: string;
}

export interface UpdateShopInput {
  displayName?: string;
  availability?: ShopSpec['availability'];
  databaseTier?: ShopSpec['databaseTier'];
  walletAddress?: string;
  chainId?: number;
  backendImage?: string | null;
  frontendImage?: string | null;
}

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(
    @InjectRepository(Shop)
    private readonly shops: Repository<Shop>,
    private readonly k8s: ShopCRClient,
  ) {}

  async createForUser(userId: string, input: CreateShopInput): Promise<Shop> {
    const shop = this.shops.create({
      userId,
      k8sName: generateShopK8sName(),
      displayName: input.displayName,
      host: input.host,
      availability: input.availability,
      databaseTier: input.databaseTier,
      walletAddress: input.walletAddress,
      chainId: String(input.chainId ?? 11155111),
      backendImage: input.backendImage ?? null,
      frontendImage: input.frontendImage ?? null,
    });

    let saved: Shop;
    try {
      saved = await this.shops.save(shop);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Host or shop name is already taken');
      }
      throw err;
    }

    try {
      await this.k8s.create(saved.k8sName, shopEntityToCRSpec(saved));
    } catch (err) {
      this.logger.error(
        `Failed to create Shop CR ${saved.k8sName}, rolling back DB row`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.shops.delete(saved.id);
      throw err;
    }
    return saved;
  }

  findAllForUser(userId: string): Promise<Shop[]> {
    return this.shops.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(userId: string, id: string): Promise<Shop> {
    const shop = await this.shops.findOne({ where: { id, userId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return shop;
  }

  async updateForUser(
    userId: string,
    id: string,
    input: UpdateShopInput,
  ): Promise<Shop> {
    const shop = await this.findOneForUser(userId, id);

    if (input.displayName !== undefined) shop.displayName = input.displayName;
    if (input.availability !== undefined)
      shop.availability = input.availability;
    if (input.databaseTier !== undefined)
      shop.databaseTier = input.databaseTier;
    if (input.walletAddress !== undefined)
      shop.walletAddress = input.walletAddress;
    if (input.chainId !== undefined) shop.chainId = String(input.chainId);
    if (input.backendImage !== undefined)
      shop.backendImage = input.backendImage;
    if (input.frontendImage !== undefined)
      shop.frontendImage = input.frontendImage;

    const saved = await this.shops.save(shop);
    await this.k8s.patchSpec(saved.k8sName, shopEntityToCRSpec(saved));
    return saved;
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    const shop = await this.findOneForUser(userId, id);
    await this.k8s.delete(shop.k8sName);
    await this.shops.delete(shop.id);
  }

  /**
   * Sweeps every Shop row and copies the latest phase + url from its CR
   * status into the DB. Intended to be called from a scheduled job.
   */
  async syncAllStatuses(): Promise<void> {
    if (!this.k8s.isReady()) {
      return;
    }
    const shops = await this.shops.find();
    for (const shop of shops) {
      try {
        const cr = await this.k8s.get(shop.k8sName);
        if (!cr) {
          continue;
        }
        const phase = cr.status?.phase ?? null;
        const url = cr.status?.url ?? null;
        if (phase !== shop.lastKnownPhase || url !== shop.lastKnownUrl) {
          shop.lastKnownPhase = phase;
          shop.lastKnownUrl = url;
          await this.shops.save(shop);
        }
      } catch (err) {
        this.logger.warn(
          `Status sync failed for shop ${shop.k8sName}: ${
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

function generateShopK8sName(): string {
  return `shop-${randomBytes(4).toString('hex')}`;
}
