/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { QueryFailedError } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { SiweNonceStore } from './siwe-nonce.store';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let jwt: jest.Mocked<JwtService>;

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: null,
    walletAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    normalize: () => undefined,
    ...overrides,
  });

  beforeEach(async () => {
    const usersMock: Partial<jest.Mocked<UsersService>> = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByWalletAddress: jest.fn(),
      createWithPassword: jest.fn(),
      createWithWallet: jest.fn(),
    };
    const jwtMock: Partial<jest.Mocked<JwtService>> = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    };
    const configMock: Partial<ConfigService> = {
      getOrThrow: jest.fn().mockReturnValue('localhost:3000'),
    };
    const nonceMock: Partial<SiweNonceStore> = {
      issue: jest.fn().mockReturnValue('nonce-xyz'),
      consume: jest.fn().mockReturnValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: SiweNonceStore, useValue: nonceMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    users = moduleRef.get(UsersService);
    jwt = moduleRef.get(JwtService);
  });

  describe('registerWithPassword', () => {
    it('hashes the password and returns a signed JWT', async () => {
      const created = buildUser({ passwordHash: 'hash' });
      users.createWithPassword.mockResolvedValue(created);

      const result = await service.registerWithPassword(
        'alice@example.com',
        'password123',
      );

      expect(users.createWithPassword).toHaveBeenCalledTimes(1);
      const [emailArg, hashArg] = users.createWithPassword.mock.calls[0];
      expect(emailArg).toBe('alice@example.com');
      expect(hashArg).not.toBe('password123');
      await expect(argon2.verify(hashArg, 'password123')).resolves.toBe(true);

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.user.id).toBe(created.id);
      expect(jwt.sign).toHaveBeenCalledWith({ sub: created.id });
    });

    it('throws ConflictException on unique violation', async () => {
      const err = new QueryFailedError('q', [], new Error('dup'));
      (err as QueryFailedError & { code?: string }).code = '23505';
      users.createWithPassword.mockRejectedValue(err);

      await expect(
        service.registerWithPassword('alice@example.com', 'password123'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('loginWithPassword', () => {
    it('throws UnauthorizedException when user not found', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(
        service.loginWithPassword('missing@example.com', 'pw'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hash = await argon2.hash('correct-password');
      users.findByEmail.mockResolvedValue(
        buildUser({ passwordHash: hash, email: 'alice@example.com' }),
      );
      await expect(
        service.loginWithPassword('alice@example.com', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a token when credentials match', async () => {
      const hash = await argon2.hash('correct-password');
      users.findByEmail.mockResolvedValue(
        buildUser({ passwordHash: hash, email: 'alice@example.com' }),
      );
      const result = await service.loginWithPassword(
        'alice@example.com',
        'correct-password',
      );
      expect(result.accessToken).toBe('signed-jwt');
    });
  });
});
