import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { DiscordChannelCRClient } from '../k8s/discord-channel-cr.client';
import { SecretsClient } from '../k8s/secrets.client';
import { Shop } from '../shops/entities/shop.entity';
import { DiscordChannel } from './entities/discord-channel.entity';
import { discordChannelEntityToCRSpec } from './discord-channels.mapper';

const PG_UNIQUE_VIOLATION = '23505';
const DEFAULT_MIN_SEVERITY = 'warning';

export interface CreateDiscordChannelInput {
  channelName: string;
  webhookUrl: string;
  shopId?: string;
  minSeverity?: 'info' | 'warning' | 'critical';
}

export interface UpdateDiscordChannelInput {
  channelName?: string;
  webhookUrl?: string;
  shopId?: string | null;
  minSeverity?: 'info' | 'warning' | 'critical';
}

@Injectable()
export class DiscordChannelsService {
  private readonly logger = new Logger(DiscordChannelsService.name);

  constructor(
    @InjectRepository(DiscordChannel)
    private readonly channels: Repository<DiscordChannel>,
    @InjectRepository(Shop)
    private readonly shops: Repository<Shop>,
    private readonly k8s: DiscordChannelCRClient,
    private readonly secrets: SecretsClient,
  ) {}

  async createForUser(
    userId: string,
    input: CreateDiscordChannelInput,
  ): Promise<DiscordChannel> {
    const shopK8sName = await this.resolveShopK8sName(userId, input.shopId);

    const channel = this.channels.create({
      userId,
      shopId: input.shopId ?? null,
      k8sName: generateChannelK8sName(),
      secretName: generateSecretName(),
      channelName: input.channelName,
      minSeverity: input.minSeverity ?? DEFAULT_MIN_SEVERITY,
    });

    let saved: DiscordChannel;
    try {
      saved = await this.channels.save(channel);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Channel name collision; please retry');
      }
      throw err;
    }

    // Order matters: Secret first so the CR has something to point at, then
    // the CR. If either step fails we unwind in reverse and drop the DB row.
    try {
      await this.secrets.create(saved.secretName, { url: input.webhookUrl });
    } catch (err) {
      await this.channels.delete(saved.id);
      throw err;
    }

    try {
      await this.k8s.create(
        saved.k8sName,
        discordChannelEntityToCRSpec(saved, shopK8sName),
      );
    } catch (err) {
      this.logger.error(
        `Failed to create DiscordChannel CR ${saved.k8sName}, unwinding Secret and DB row`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.safeDeleteSecret(saved.secretName);
      await this.channels.delete(saved.id);
      throw err;
    }
    return saved;
  }

  findAllForUser(userId: string): Promise<DiscordChannel[]> {
    return this.channels.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(userId: string, id: string): Promise<DiscordChannel> {
    const channel = await this.channels.findOne({ where: { id, userId } });
    if (!channel) {
      throw new NotFoundException('Discord channel not found');
    }
    return channel;
  }

  async updateForUser(
    userId: string,
    id: string,
    input: UpdateDiscordChannelInput,
  ): Promise<DiscordChannel> {
    const channel = await this.findOneForUser(userId, id);

    if (input.shopId !== undefined) {
      const newShopId = input.shopId;
      if (newShopId === null) {
        channel.shopId = null;
      } else {
        // resolveShopK8sName validates ownership; we accept its check as the
        // authoritative answer and copy the id over.
        await this.resolveShopK8sName(userId, newShopId);
        channel.shopId = newShopId;
      }
    }
    if (input.channelName !== undefined) channel.channelName = input.channelName;
    if (input.minSeverity !== undefined) channel.minSeverity = input.minSeverity;

    const saved = await this.channels.save(channel);

    if (input.webhookUrl !== undefined) {
      await this.secrets.patchStringData(saved.secretName, {
        url: input.webhookUrl,
      });
    }

    const shopK8sName = await this.resolveShopK8sName(
      userId,
      saved.shopId ?? undefined,
    );
    await this.k8s.patchSpec(
      saved.k8sName,
      discordChannelEntityToCRSpec(saved, shopK8sName),
    );
    return saved;
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    const channel = await this.findOneForUser(userId, id);
    await this.k8s.delete(channel.k8sName);
    await this.safeDeleteSecret(channel.secretName);
    await this.channels.delete(channel.id);
  }

  /**
   * Sweeps every DiscordChannel row and copies the latest phase from its CR
   * status into the DB. Intended to be called from a scheduled job.
   */
  async syncAllStatuses(): Promise<void> {
    if (!this.k8s.isReady()) {
      return;
    }
    const channels = await this.channels.find();
    for (const channel of channels) {
      try {
        const cr = await this.k8s.get(channel.k8sName);
        if (!cr) {
          continue;
        }
        const phase = cr.status?.phase ?? null;
        if (phase !== channel.lastKnownPhase) {
          channel.lastKnownPhase = phase;
          await this.channels.save(channel);
        }
      } catch (err) {
        this.logger.warn(
          `Status sync failed for channel ${channel.k8sName}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  private async resolveShopK8sName(
    userId: string,
    shopId: string | undefined,
  ): Promise<string | null> {
    if (!shopId) return null;
    const shop = await this.shops.findOne({ where: { id: shopId, userId } });
    if (!shop) {
      throw new NotFoundException('Shop not found for this user');
    }
    return shop.k8sName;
  }

  private async safeDeleteSecret(name: string): Promise<void> {
    try {
      await this.secrets.delete(name);
    } catch (err) {
      this.logger.warn(
        `Failed to delete Secret ${name}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}

function generateChannelK8sName(): string {
  return `dch-${randomBytes(4).toString('hex')}`;
}

function generateSecretName(): string {
  return `dch-secret-${randomBytes(4).toString('hex')}`;
}
