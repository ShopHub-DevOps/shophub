import { otelSDK } from './observability/instrumentation';
otelSDK.start();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // SIWE_ORIGIN in env(eg K8s)
  if (process.env.SIWE_ORIGIN) {
    allowedOrigins.push(process.env.SIWE_ORIGIN);
  }

  app.useLogger(app.get(Logger));
  app.enableCors({
    //origin: process.env.SIWE_ORIGIN ?? 'http://localhost:3000',
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
