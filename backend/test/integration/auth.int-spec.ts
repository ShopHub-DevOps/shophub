/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Wallet } from 'ethers';
import { SiweMessage } from 'siwe';
import request from 'supertest';
import { AuthModule } from '../../src/auth/auth.module';
import { validateEnv } from '../../src/config/env.validation';
import { UsersModule } from '../../src/users/users.module';

describe('Auth (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

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
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          autoLoadEntities: true,
          synchronize: true,
        }),
        UsersModule,
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 90000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const credentials = {
    email: 'alice@example.com',
    password: 'super-secret-pw',
  };

  describe('email + password flow', () => {
    let token: string;

    it('rejects malformed input', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('registers a new user and issues a JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials);
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        email: credentials.email,
        walletAddress: null,
      });
      token = res.body.accessToken;
    });

    it('rejects duplicate registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials);
      expect(res.status).toBe(409);
    });

    it('logs in with the same credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials);
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('rejects login with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: credentials.email, password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('returns the current user from /auth/me with a valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(credentials.email);
    });

    it('rejects /auth/me without a token', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('SIWE flow', () => {
    it('signs in with a wallet, persisting the lower-cased address', async () => {
      const wallet = Wallet.createRandom();
      const nonceRes = await request(app.getHttpServer()).get(
        '/auth/siwe/nonce',
      );
      expect(nonceRes.status).toBe(200);
      const nonce: string = nonceRes.body.nonce;

      const message = new SiweMessage({
        domain: 'localhost:3000',
        address: wallet.address,
        statement: 'Sign in to ShopHub',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 11155111,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();
      const signature = await wallet.signMessage(prepared);

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/siwe/verify')
        .send({ message: prepared, signature });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.accessToken).toEqual(expect.any(String));
      expect(verifyRes.body.user.walletAddress).toBe(
        wallet.address.toLowerCase(),
      );

      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${verifyRes.body.accessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.walletAddress).toBe(wallet.address.toLowerCase());
    });

    it('rejects reuse of a consumed nonce', async () => {
      const wallet = Wallet.createRandom();
      const nonceRes = await request(app.getHttpServer()).get(
        '/auth/siwe/nonce',
      );
      const nonce: string = nonceRes.body.nonce;

      const buildSigned = async () => {
        const message = new SiweMessage({
          domain: 'localhost:3000',
          address: wallet.address,
          statement: 'Sign in to ShopHub',
          uri: 'http://localhost:3000',
          version: '1',
          chainId: 11155111,
          nonce,
          issuedAt: new Date().toISOString(),
        });
        const prepared = message.prepareMessage();
        const signature = await wallet.signMessage(prepared);
        return { prepared, signature };
      };

      const first = await buildSigned();
      const ok = await request(app.getHttpServer())
        .post('/auth/siwe/verify')
        .send({ message: first.prepared, signature: first.signature });
      expect(ok.status).toBe(200);

      const second = await buildSigned();
      const fail = await request(app.getHttpServer())
        .post('/auth/siwe/verify')
        .send({ message: second.prepared, signature: second.signature });
      expect(fail.status).toBe(401);
    });
  });
});
