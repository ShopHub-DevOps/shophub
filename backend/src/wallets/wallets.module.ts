import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { K8sModule } from '../k8s/k8s.module';
import { UsersModule } from '../users/users.module';
import { Wallet } from './entities/wallet.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletsStatusPoller } from './wallets-status.poller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    AuthModule,
    K8sModule,
    UsersModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService, WalletsStatusPoller],
  exports: [WalletsService],
})
export class WalletsModule {}
