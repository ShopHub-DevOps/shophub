/* eslint-disable @typescript-eslint/no-require-imports */
// @kubernetes/client-node ships as ESM in v1.x; ts-jest's CJS transform
// chokes on it. e2e tests boot the full AppModule which pulls in
// ShopsModule -> ShopCRClient -> @kubernetes/client-node, so we stub it
// at module-load time. No K8s calls happen in these tests.
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
import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { App } from 'supertest/types';

describe('AppController (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = `postgres://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getMappedPort(5432)}/${container.getDatabase()}`;

    // require avoids hoisting the AppModule load above the DATABASE_URL assignment
    // (a top-level `import` would evaluate DatabaseModule.register() before the env var is set).
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET) returns 200 with status ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
