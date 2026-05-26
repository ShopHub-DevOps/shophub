import { Module } from '@nestjs/common';
import { ShopCRClient } from './shop-cr.client';

@Module({
  providers: [ShopCRClient],
  exports: [ShopCRClient],
})
export class K8sModule {}
