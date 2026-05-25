export type AvailabilityTier = 'standard' | 'high';
export type DatabaseTier = 'standard' | 'light';
export type ShopPhase =
  | 'Pending'
  | 'Provisioning'
  | 'Ready'
  | 'Failed'
  | 'Terminating';

export interface Shop {
  id: string;
  userId: string;
  k8sName: string;
  displayName: string;
  host: string;
  availability: AvailabilityTier;
  databaseTier: DatabaseTier;
  walletAddress: string;
  chainId: string;
  backendImage: string | null;
  frontendImage: string | null;
  lastKnownPhase: ShopPhase | null;
  lastKnownUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShopRequest {
  displayName: string;
  host: string;
  availability: AvailabilityTier;
  databaseTier: DatabaseTier;
  walletAddress: string;
  chainId?: number;
  backendImage?: string;
  frontendImage?: string;
}

export interface UpdateShopRequest {
  displayName?: string;
  availability?: AvailabilityTier;
  databaseTier?: DatabaseTier;
  walletAddress?: string;
  chainId?: number;
  backendImage?: string | null;
  frontendImage?: string | null;
}

export function phaseColorClass(phase: ShopPhase | null): string {
  switch (phase) {
    case 'Ready':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    case 'Provisioning':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    case 'Failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
    case 'Terminating':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200';
  }
}
