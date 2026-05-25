// TypeScript mirror of api/v1alpha1/shop_types.go in the shop-operator repo.
// Kept in sync manually until we share a contract via OpenAPI codegen.

export type AvailabilityTier = 'standard' | 'high';
export type DatabaseTier = 'standard' | 'light';
export type ShopPhase =
  | 'Pending'
  | 'Provisioning'
  | 'Ready'
  | 'Failed'
  | 'Terminating';

export interface ShopImages {
  backend?: string;
  frontend?: string;
}

export interface ShopSpec {
  displayName: string;
  host: string;
  availability: AvailabilityTier;
  databaseTier: DatabaseTier;
  walletAddress: string;
  chainId?: number;
  images?: ShopImages;
}

export interface ShopCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  observedGeneration?: number;
  lastTransitionTime?: string;
}

export interface ShopStatus {
  phase?: ShopPhase;
  url?: string;
  conditions?: ShopCondition[];
  observedGeneration?: number;
}

export interface ShopCR {
  apiVersion: 'shophub.io/v1alpha1';
  kind: 'Shop';
  metadata: {
    name: string;
    namespace: string;
    generation?: number;
    resourceVersion?: string;
    uid?: string;
    creationTimestamp?: string;
  };
  spec: ShopSpec;
  status?: ShopStatus;
}
