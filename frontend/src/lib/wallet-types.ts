export type WalletPurpose = 'payments' | 'payout';
export type WalletPhase = 'Pending' | 'Ready' | 'Failed' | 'Terminating';

export interface Wallet {
  id: string;
  userId: string;
  k8sName: string;
  displayName: string;
  address: string;
  chainId: string;
  purpose: WalletPurpose;
  lastKnownPhase: WalletPhase | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletRequest {
  displayName: string;
  address: string;
  chainId?: number;
  purpose?: WalletPurpose;
}

export interface UpdateWalletRequest {
  displayName?: string;
  purpose?: WalletPurpose;
}

export function walletPhaseColorClass(phase: WalletPhase | null): string {
  switch (phase) {
    case 'Ready':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    case 'Failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
    case 'Terminating':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200';
  }
}
