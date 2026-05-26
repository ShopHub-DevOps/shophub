/* eslint-disable @typescript-eslint/unbound-method */
// @kubernetes/client-node ships as ESM in v1.x; ts-jest's CJS transform
// chokes on it. We never call the real client in unit tests (the CR client
// and Secrets client are replaced via DI), so an empty mock at module load
// time is enough.
jest.mock('@kubernetes/client-node', () => ({
  CustomObjectsApi: class {},
  CoreV1Api: class {},
  KubeConfig: class {
    loadFromDefault(): void {}
    makeApiClient(): unknown {
      return {};
    }
    getCurrentContext(): string {
      return 'mock';
    }
  },
  PatchStrategy: { MergePatch: 'application/merge-patch+json' },
  setHeaderOptions: () => ({}),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { DiscordChannelCRClient } from '../k8s/discord-channel-cr.client';
import { SecretsClient } from '../k8s/secrets.client';
import { Shop } from '../shops/entities/shop.entity';
import { DiscordChannel } from './entities/discord-channel.entity';
import { DiscordChannelsService } from './discord-channels.service';

describe('DiscordChannelsService (unit)', () => {
  let service: DiscordChannelsService;
  let channelRepo: jest.Mocked<Repository<DiscordChannel>>;
  let shopRepo: jest.Mocked<Repository<Shop>>;
  let k8s: jest.Mocked<DiscordChannelCRClient>;
  let secrets: jest.Mocked<SecretsClient>;

  const ownerId = '00000000-0000-0000-0000-000000000001';
  const otherId = '00000000-0000-0000-0000-000000000002';
  const shopId = '11111111-1111-1111-1111-111111111111';

  const sampleInput = {
    channelName: 'alerts',
    webhookUrl: 'https://discord.com/api/webhooks/123/abc',
  };

  const buildChannel = (over: Partial<DiscordChannel> = {}): DiscordChannel => ({
    id: 'channel-id-1',
    userId: ownerId,
    shopId: null,
    k8sName: 'dch-deadbeef',
    secretName: 'dch-secret-deadbeef',
    channelName: 'alerts',
    minSeverity: 'warning',
    lastKnownPhase: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  const buildShop = (over: Partial<Shop> = {}): Shop => ({
    id: shopId,
    userId: ownerId,
    k8sName: 'shop-deadbeef',
    displayName: 'Demo',
    host: 'demo.shophub.local',
    availability: 'standard',
    databaseTier: 'standard',
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    chainId: '11155111',
    backendImage: null,
    frontendImage: null,
    lastKnownPhase: null,
    lastKnownUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    normalize: () => undefined,
    ...over,
  });

  beforeEach(async () => {
    const channelRepoMock: Partial<jest.Mocked<Repository<DiscordChannel>>> = {
      create: jest
        .fn()
        .mockImplementation((data: Partial<DiscordChannel>) => buildChannel(data)),
      save: jest
        .fn()
        .mockImplementation((channel: DiscordChannel) => Promise.resolve(channel)),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const shopRepoMock: Partial<jest.Mocked<Repository<Shop>>> = {
      findOne: jest.fn(),
    };
    const k8sMock: Partial<jest.Mocked<DiscordChannelCRClient>> = {
      isReady: jest.fn().mockReturnValue(true),
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      patchSpec: jest.fn(),
      delete: jest.fn(),
    };
    const secretsMock: Partial<jest.Mocked<SecretsClient>> = {
      isReady: jest.fn().mockReturnValue(true),
      create: jest.fn(),
      patchStringData: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscordChannelsService,
        { provide: getRepositoryToken(DiscordChannel), useValue: channelRepoMock },
        { provide: getRepositoryToken(Shop), useValue: shopRepoMock },
        { provide: DiscordChannelCRClient, useValue: k8sMock },
        { provide: SecretsClient, useValue: secretsMock },
      ],
    }).compile();

    service = moduleRef.get(DiscordChannelsService);
    channelRepo = moduleRef.get(getRepositoryToken(DiscordChannel));
    shopRepo = moduleRef.get(getRepositoryToken(Shop));
    k8s = moduleRef.get(DiscordChannelCRClient);
    secrets = moduleRef.get(SecretsClient);
  });

  describe('createForUser', () => {
    it('writes the webhook URL to a Kubernetes Secret, then creates the CR', async () => {
      await service.createForUser(ownerId, sampleInput);

      expect(channelRepo.save).toHaveBeenCalledTimes(1);
      const saved = channelRepo.save.mock.calls[0][0] as DiscordChannel;
      expect(saved.k8sName).toMatch(/^dch-[a-f0-9]{8}$/);
      expect(saved.secretName).toMatch(/^dch-secret-[a-f0-9]{8}$/);

      expect(secrets.create).toHaveBeenCalledWith(saved.secretName, {
        url: sampleInput.webhookUrl,
      });
      expect(k8s.create).toHaveBeenCalledTimes(1);
      const [name, spec] = k8s.create.mock.calls[0];
      expect(name).toBe(saved.k8sName);
      expect(spec.webhookSecretRef).toEqual({
        name: saved.secretName,
        key: 'url',
      });
      expect(spec.shopRef).toBeUndefined();
    });

    it('attaches the shop k8sName as shopRef when shopId is provided', async () => {
      shopRepo.findOne.mockResolvedValue(buildShop());

      await service.createForUser(ownerId, { ...sampleInput, shopId });

      const [, spec] = k8s.create.mock.calls[0];
      expect(spec.shopRef).toBe('shop-deadbeef');
    });

    it('rejects shopId that belongs to another user', async () => {
      shopRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createForUser(otherId, { ...sampleInput, shopId }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(secrets.create).not.toHaveBeenCalled();
      expect(k8s.create).not.toHaveBeenCalled();
    });

    it('unwinds the Secret and DB row when the CR create fails', async () => {
      k8s.create.mockRejectedValue(new Error('cluster unreachable'));

      await expect(
        service.createForUser(ownerId, sampleInput),
      ).rejects.toThrow('cluster unreachable');

      expect(secrets.delete).toHaveBeenCalledTimes(1);
      expect(channelRepo.delete).toHaveBeenCalledTimes(1);
    });

    it('drops the DB row when Secret create fails', async () => {
      secrets.create.mockRejectedValue(new ConflictException('boom'));

      await expect(
        service.createForUser(ownerId, sampleInput),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(k8s.create).not.toHaveBeenCalled();
      expect(channelRepo.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOneForUser', () => {
    it('throws NotFoundException for someone else\'s channel', async () => {
      channelRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneForUser(otherId, 'channel-id-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateForUser', () => {
    it('rotates the Secret when a new webhookUrl is supplied', async () => {
      channelRepo.findOne.mockResolvedValue(buildChannel());

      await service.updateForUser(ownerId, 'channel-id-1', {
        webhookUrl: 'https://discord.com/api/webhooks/999/rotated',
      });

      expect(secrets.patchStringData).toHaveBeenCalledWith('dch-secret-deadbeef', {
        url: 'https://discord.com/api/webhooks/999/rotated',
      });
      expect(k8s.patchSpec).toHaveBeenCalledTimes(1);
    });

    it('clears shopRef when shopId is set to null', async () => {
      channelRepo.findOne.mockResolvedValue(buildChannel({ shopId }));

      await service.updateForUser(ownerId, 'channel-id-1', { shopId: null });

      const [, spec] = k8s.patchSpec.mock.calls[0];
      expect(spec.shopRef).toBeUndefined();
    });
  });

  describe('deleteForUser', () => {
    it('removes CR, Secret, then DB row in that order', async () => {
      channelRepo.findOne.mockResolvedValue(buildChannel());
      const order: string[] = [];
      k8s.delete.mockImplementation(async () => {
        order.push('cr');
      });
      secrets.delete.mockImplementation(async () => {
        order.push('secret');
      });
      channelRepo.delete.mockImplementation(async () => {
        order.push('db');
        return { affected: 1, raw: [] };
      });

      await service.deleteForUser(ownerId, 'channel-id-1');

      expect(order).toEqual(['cr', 'secret', 'db']);
    });
  });

  describe('syncAllStatuses', () => {
    it('copies phase from the CR to the DB', async () => {
      const channel = buildChannel();
      channelRepo.find.mockResolvedValue([channel]);
      k8s.get.mockResolvedValue({
        apiVersion: 'shophub.io/v1alpha1',
        kind: 'DiscordChannel',
        metadata: { name: channel.k8sName, namespace: 'shophub-tenants' },
        spec: {
          channelName: channel.channelName,
          webhookSecretRef: { name: channel.secretName, key: 'url' },
          minSeverity: channel.minSeverity,
        },
        status: { phase: 'Ready' },
      });

      await service.syncAllStatuses();

      expect(channelRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastKnownPhase: 'Ready' }),
      );
    });

    it('does nothing when the K8s client is not ready', async () => {
      k8s.isReady.mockReturnValue(false);
      await service.syncAllStatuses();
      expect(channelRepo.find).not.toHaveBeenCalled();
    });
  });
});
