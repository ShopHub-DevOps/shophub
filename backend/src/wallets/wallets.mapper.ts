import { WalletSpec } from '../k8s/wallet-cr.types';
import { Wallet } from './entities/wallet.entity';

/**
 * Translates a Wallet database row into the spec the operator expects.
 * ownerRef carries the userId so the CR is auditable back to its owner
 * without joining the platform DB.
 */
export function walletEntityToCRSpec(wallet: Wallet): WalletSpec {
  return {
    displayName: wallet.displayName,
    address: wallet.address,
    chainId: Number(wallet.chainId),
    purpose: wallet.purpose,
    ownerRef: wallet.userId,
  };
}
