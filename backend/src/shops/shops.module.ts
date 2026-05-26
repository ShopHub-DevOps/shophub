import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { K8sModule } from '../k8s/k8s.module';
import { UsersModule } from '../users/users.module';
import { Shop } from './entities/shop.entity';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { ShopsStatusPoller } from './shops-status.poller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop]),
    AuthModule,
    K8sModule,
    UsersModule,
  ],
  controllers: [ShopsController],
  providers: [ShopsService, ShopsStatusPoller],
  exports: [ShopsService],
})
export class ShopsModule {}
