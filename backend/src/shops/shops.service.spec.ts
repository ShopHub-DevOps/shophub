/* eslint-disable @typescript-eslint/unbound-method */
// @kubernetes/client-node ships as ESM in v1.x; ts-jest's CJS transform
// chokes on it. We never call the real client in unit tests (ShopCRClient
// is replaced via DI), so an empty mock at module load time is enough.
jest.mock('@kubernetes/client-node', () => ({
  CustomObjectsApi: class {},
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
import { QueryFailedError, Repository } from 'typeorm';
import { ShopCRClient } from '../k8s/shop-cr.client';
import { Shop } from './entities/shop.entity';
import { ShopsService } from './shops.service';

describe('ShopsService (unit)', () => {
  let service: ShopsService;
  let repo: jest.Mocked<Repository<Shop>>;
  let k8s: jest.Mocked<ShopCRClient>;

  const ownerId = '00000000-0000-0000-0000-000000000001';
  const otherId = '00000000-0000-0000-0000-000000000002';

  const sampleInput = {
    displayName: 'Demo',
    host: 'demo.shophub.local',
    availability: 'standard' as const,
    databaseTier: 'standard' as const,
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    chainId: 11155111,
  };

  const buildShop = (over: Partial<Shop> = {}): Shop => ({
    id: 'shop-id-1',
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
    const repoMock: Partial<jest.Mocked<Repository<Shop>>> = {
      create: jest
        .fn()
        .mockImplementation((data: Partial<Shop>) => buildShop(data)),
      save: jest.fn().mockImplementation((shop: Shop) => Promise.resolve(shop)),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const k8sMock: Partial<jest.Mocked<ShopCRClient>> = {
      isReady: jest.fn().mockReturnValue(true),
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      patchSpec: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: getRepositoryToken(Shop), useValue: repoMock },
        { provide: ShopCRClient, useValue: k8sMock },
      ],
    }).compile();

    service = moduleRef.get(ShopsService);
    repo = moduleRef.get(getRepositoryToken(Shop));
    k8s = moduleRef.get(ShopCRClient);
  });

  describe('createForUser', () => {
    it('persists the shop and applies a Shop CR with the mapped spec', async () => {
      await service.createForUser(ownerId, sampleInput);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const saved = repo.save.mock.calls[0][0] as Shop;
      expect(saved.userId).toBe(ownerId);
      expect(saved.k8sName).toMatch(/^shop-[a-f0-9]{8}$/);

      expect(k8s.create).toHaveBeenCalledTimes(1);
      const [name, spec] = k8s.create.mock.calls[0];
      expect(name).toBe(saved.k8sName);
      expect(spec).toMatchObject({
        displayName: 'Demo',
        host: 'demo.shophub.local',
        availability: 'standard',
        databaseTier: 'standard',
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        chainId: 11155111,
      });
    });

    it('rolls back the DB row when the CR create fails', async () => {
      k8s.create.mockRejectedValue(new Error('cluster unreachable'));

      await expect(service.createForUser(ownerId, sampleInput)).rejects.toThrow(
        'cluster unreachable',
      );

      expect(repo.delete).toHaveBeenCalledTimes(1);
    });

    it('translates DB unique violations to ConflictException', async () => {
      const err = new QueryFailedError('q', [], new Error('dup'));
      (err as QueryFailedError & { code?: string }).code = '23505';
      repo.save.mockRejectedValueOnce(err);

      await expect(
        service.createForUser(ownerId, sampleInput),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(k8s.create).not.toHaveBeenCalled();
    });
  });

  describe('findOneForUser', () => {
    it('returns the shop when it belongs to the user', async () => {
      const shop = buildShop();
      repo.findOne.mockResolvedValue(shop);

      const got = await service.findOneForUser(ownerId, shop.id);
      expect(got).toBe(shop);
    });

    it('throws NotFoundException when the shop belongs to another user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneForUser(otherId, 'shop-id-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateForUser', () => {
    it('patches the CR with the merged spec', async () => {
      const existing = buildShop();
      repo.findOne.mockResolvedValue(existing);

      await service.updateForUser(ownerId, existing.id, {
        availability: 'high',
        walletAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(k8s.patchSpec).toHaveBeenCalledTimes(1);
      const [name, spec] = k8s.patchSpec.mock.calls[0];
      expect(name).toBe(existing.k8sName);
      expect(spec.availability).toBe('high');
      expect(spec.walletAddress).toBe(
        '0x1111111111111111111111111111111111111111',
      );
    });
  });

  describe('deleteForUser', () => {
    it('deletes the CR before deleting the DB row', async () => {
      const existing = buildShop();
      repo.findOne.mockResolvedValue(existing);
      const order: string[] = [];
      k8s.delete.mockImplementation(async () => {
        order.push('cr');
      });
      repo.delete.mockImplementation(async () => {
        order.push('db');
        return { affected: 1, raw: [] };
      });

      await service.deleteForUser(ownerId, existing.id);

      expect(order).toEqual(['cr', 'db']);
    });
  });

  describe('syncAllStatuses', () => {
    it('copies phase and url from the CR to the DB', async () => {
      const shop = buildShop({ lastKnownPhase: null, lastKnownUrl: null });
      repo.find.mockResolvedValue([shop]);
      k8s.get.mockResolvedValue({
        apiVersion: 'shophub.io/v1alpha1',
        kind: 'Shop',
        metadata: { name: shop.k8sName, namespace: 'shophub-tenants' },
        spec: {
          displayName: shop.displayName,
          host: shop.host,
          availability: shop.availability,
          databaseTier: shop.databaseTier,
          walletAddress: shop.walletAddress,
        },
        status: { phase: 'Ready', url: 'https://demo.shophub.local' },
      });

      await service.syncAllStatuses();

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastKnownPhase: 'Ready',
          lastKnownUrl: 'https://demo.shophub.local',
        }),
      );
    });

    it('does nothing when the K8s client is not ready', async () => {
      k8s.isReady.mockReturnValue(false);
      await service.syncAllStatuses();
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
});
