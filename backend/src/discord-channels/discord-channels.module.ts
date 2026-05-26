import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { K8sModule } from '../k8s/k8s.module';
import { Shop } from '../shops/entities/shop.entity';
import { UsersModule } from '../users/users.module';
import { DiscordChannel } from './entities/discord-channel.entity';
import { DiscordChannelsController } from './discord-channels.controller';
import { DiscordChannelsService } from './discord-channels.service';
import { DiscordChannelsStatusPoller } from './discord-channels-status.poller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiscordChannel, Shop]),
    AuthModule,
    K8sModule,
    UsersModule,
  ],
  controllers: [DiscordChannelsController],
  providers: [DiscordChannelsService, DiscordChannelsStatusPoller],
  exports: [DiscordChannelsService],
})
export class DiscordChannelsModule {}
