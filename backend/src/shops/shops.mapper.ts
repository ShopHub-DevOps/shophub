import { ShopSpec } from '../k8s/shop-cr.types';
import { Shop } from './entities/shop.entity';

/**
 * Translates a Shop database entity into the spec body the operator expects.
 * Optional images object is omitted when both fields are null so we never
 * write `{ backend: '', frontend: '' }` to the cluster.
 */
export function shopEntityToCRSpec(shop: Shop): ShopSpec {
  const spec: ShopSpec = {
    displayName: shop.displayName,
    host: shop.host,
    availability: shop.availability,
    databaseTier: shop.databaseTier,
    walletAddress: shop.walletAddress,
    chainId: Number(shop.chainId),
  };
  if (shop.backendImage || shop.frontendImage) {
    spec.images = {};
    if (shop.backendImage) spec.images.backend = shop.backendImage;
    if (shop.frontendImage) spec.images.frontend = shop.frontendImage;
  }
  return spec;
}
