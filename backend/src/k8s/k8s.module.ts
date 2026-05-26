import { Module } from '@nestjs/common';
import { DiscordChannelCRClient } from './discord-channel-cr.client';
import { SecretsClient } from './secrets.client';
import { ShopCRClient } from './shop-cr.client';
import { WalletCRClient } from './wallet-cr.client';

@Module({
  providers: [
    ShopCRClient,
    DiscordChannelCRClient,
    WalletCRClient,
    SecretsClient,
  ],
  exports: [
    ShopCRClient,
    DiscordChannelCRClient,
    WalletCRClient,
    SecretsClient,
  ],
})
export class K8sModule {}
