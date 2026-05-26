/* eslint-disable @typescript-eslint/unbound-method */
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
import { QueryFailedError, Repository } from 'typeorm';
import { WalletCRClient } from '../k8s/wallet-cr.client';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './wallets.service';

describe('WalletsService (unit)', () => {
  let service: WalletsService;
  let repo: jest.Mocked<Repository<Wallet>>;
  let k8s: jest.Mocked<WalletCRClient>;

  const ownerId = '00000000-0000-0000-0000-000000000001';
  const otherId = '00000000-0000-0000-0000-000000000002';

  const sampleInput = {
    displayName: 'Main wallet',
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
  };

  const buildWallet = (over: Partial<Wallet> = {}): Wallet => ({
    id: 'wallet-id-1',
    userId: ownerId,
    k8sName: 'wallet-deadbeef',
    displayName: 'Main wallet',
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    chainId: '11155111',
    purpose: 'payments',
    lastKnownPhase: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    normalize: () => undefined,
    ...over,
  });

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<Repository<Wallet>>> = {
      create: jest
        .fn()
        .mockImplementation((data: Partial<Wallet>) => buildWallet(data)),
      save: jest
        .fn()
        .mockImplementation((wallet: Wallet) => Promise.resolve(wallet)),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const k8sMock: Partial<jest.Mocked<WalletCRClient>> = {
      isReady: jest.fn().mockReturnValue(true),
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      patchSpec: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: getRepositoryToken(Wallet), useValue: repoMock },
        { provide: WalletCRClient, useValue: k8sMock },
      ],
    }).compile();

    service = moduleRef.get(WalletsService);
    repo = moduleRef.get(getRepositoryToken(Wallet));
    k8s = moduleRef.get(WalletCRClient);
  });

  describe('createForUser', () => {
    it('persists the wallet, defaults purpose and chainId, and creates the CR', async () => {
      await service.createForUser(ownerId, sampleInput);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const saved = repo.save.mock.calls[0][0] as Wallet;
      expect(saved.userId).toBe(ownerId);
      expect(saved.k8sName).toMatch(/^wallet-[a-f0-9]{8}$/);
      expect(saved.purpose).toBe('payments');
      expect(saved.chainId).toBe('11155111');

      expect(k8s.create).toHaveBeenCalledTimes(1);
      const [name, spec] = k8s.create.mock.calls[0];
      expect(name).toBe(saved.k8sName);
      expect(spec).toMatchObject({
        displayName: 'Main wallet',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        chainId: 11155111,
        purpose: 'payments',
        ownerRef: ownerId,
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
    it('throws NotFoundException when the wallet belongs to someone else', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneForUser(otherId, 'wallet-id-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateForUser', () => {
    it('patches the CR with the merged spec', async () => {
      repo.findOne.mockResolvedValue(buildWallet());

      await service.updateForUser(ownerId, 'wallet-id-1', {
        displayName: 'Renamed',
        purpose: 'payout',
      });

      expect(k8s.patchSpec).toHaveBeenCalledTimes(1);
      const [name, spec] = k8s.patchSpec.mock.calls[0];
      expect(name).toBe('wallet-deadbeef');
      expect(spec.displayName).toBe('Renamed');
      expect(spec.purpose).toBe('payout');
    });
  });

  describe('deleteForUser', () => {
    it('deletes the CR before deleting the DB row', async () => {
      repo.findOne.mockResolvedValue(buildWallet());
      const order: string[] = [];
      k8s.delete.mockImplementation(async () => {
        order.push('cr');
      });
      repo.delete.mockImplementation(async () => {
        order.push('db');
        return { affected: 1, raw: [] };
      });

      await service.deleteForUser(ownerId, 'wallet-id-1');

      expect(order).toEqual(['cr', 'db']);
    });
  });

  describe('syncAllStatuses', () => {
    it('copies phase from the CR to the DB', async () => {
      const wallet = buildWallet();
      repo.find.mockResolvedValue([wallet]);
      k8s.get.mockResolvedValue({
        apiVersion: 'shophub.io/v1alpha1',
        kind: 'Wallet',
        metadata: { name: wallet.k8sName, namespace: 'shophub-tenants' },
        spec: {
          displayName: wallet.displayName,
          address: wallet.address,
          chainId: 11155111,
          purpose: wallet.purpose,
          ownerRef: wallet.userId,
        },
        status: { phase: 'Ready' },
      });

      await service.syncAllStatuses();

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastKnownPhase: 'Ready' }),
      );
    });

    it('does nothing when the K8s client is not ready', async () => {
      k8s.isReady.mockReturnValue(false);
      await service.syncAllStatuses();
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
});
