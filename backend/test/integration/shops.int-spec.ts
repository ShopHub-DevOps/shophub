/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
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

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { AuthModule } from '../../src/auth/auth.module';
import { validateEnv } from '../../src/config/env.validation';
import { ShopCRClient } from '../../src/k8s/shop-cr.client';
import { ShopsModule } from '../../src/shops/shops.module';
import { UsersModule } from '../../src/users/users.module';

describe('Shops (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let token: string;

  const k8sMock = {
    isReady: jest.fn().mockReturnValue(true),
    create: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue([]),
    patchSpec: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    process.env.DATABASE_URL = `postgres://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getMappedPort(5432)}/${container.getDatabase()}`;
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters!!';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.SIWE_DOMAIN = 'localhost:3000';
    process.env.SIWE_ORIGIN = 'http://localhost:3000';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: false,
          ignoreEnvFile: true,
          validate: validateEnv,
        }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          autoLoadEntities: true,
          synchronize: true,
        }),
        UsersModule,
        AuthModule,
        ShopsModule,
      ],
    })
      .overrideProvider(ShopCRClient)
      .useValue(k8sMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'owner@example.com', password: 'password123' });
    token = register.body.accessToken;
  }, 90000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  beforeEach(() => {
    k8sMock.create.mockClear();
    k8sMock.patchSpec.mockClear();
    k8sMock.delete.mockClear();
  });

  const validShop = {
    displayName: 'Demo Store',
    host: 'demo.shophub.local',
    availability: 'standard',
    databaseTier: 'standard',
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  };

  describe('POST /shops', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app.getHttpServer())
        .post('/shops')
        .send(validShop);
      expect(res.status).toBe(401);
    });

    it('creates a Shop, persists it, and applies a CR', async () => {
      const res = await request(app.getHttpServer())
        .post('/shops')
        .set('Authorization', `Bearer ${token}`)
        .send(validShop);
      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.k8sName).toMatch(/^shop-[a-f0-9]{8}$/);
      expect(res.body.host).toBe(validShop.host);
      expect(k8sMock.create).toHaveBeenCalledTimes(1);
      const [name, spec] = k8sMock.create.mock.calls[0];
      expect(name).toBe(res.body.k8sName);
      expect(spec.host).toBe(validShop.host);
    });

    it('rejects invalid wallet addresses', async () => {
      const res = await request(app.getHttpServer())
        .post('/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validShop, host: 'bad.shophub.local', walletAddress: 'not-an-address' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /shops and /shops/:id', () => {
    let id: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validShop, host: 'list-test.shophub.local' });
      id = res.body.id;
    });

    it('lists only the calling users shops', async () => {
      const res = await request(app.getHttpServer())
        .get('/shops')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.find((s: { id: string }) => s.id === id)).toBeDefined();
    });

    it('returns the shop by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/shops/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it('does not leak shops belonging to another user', async () => {
      const otherReg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'intruder@example.com', password: 'password123' });
      const otherToken = otherReg.body.accessToken;

      const list = await request(app.getHttpServer())
        .get('/shops')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(list.body).toHaveLength(0);

      const get = await request(app.getHttpServer())
        .get(`/shops/${id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(get.status).toBe(404);
    });
  });

  describe('PATCH /shops/:id and DELETE', () => {
    let id: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validShop, host: 'patch-test.shophub.local' });
      id = res.body.id;
    });

    it('patches the shop and the CR', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/shops/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ availability: 'high' });
      expect(res.status).toBe(200);
      expect(res.body.availability).toBe('high');
      expect(k8sMock.patchSpec).toHaveBeenCalledTimes(1);
      const [, spec] = k8sMock.patchSpec.mock.calls[0];
      expect(spec.availability).toBe('high');
    });

    it('deletes the CR before deleting the DB row', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/shops/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);
      expect(k8sMock.delete).toHaveBeenCalledTimes(1);

      const get = await request(app.getHttpServer())
        .get(`/shops/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(get.status).toBe(404);
    });
  });
});
