// TypeScript mirror of api/v1alpha1/wallet_types.go in shop-operator.
// Kept in sync manually until we share a contract via OpenAPI codegen.

export type WalletPurpose = 'payments' | 'payout';
export type WalletPhase = 'Pending' | 'Ready' | 'Failed' | 'Terminating';

export interface WalletSpec {
  displayName: string;
  address: string;
  chainId?: number;
  purpose?: WalletPurpose;
  ownerRef?: string;
}

export interface WalletCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  observedGeneration?: number;
  lastTransitionTime?: string;
}

export interface WalletStatus {
  phase?: WalletPhase;
  conditions?: WalletCondition[];
  observedGeneration?: number;
}

export interface WalletCR {
  apiVersion: 'shophub.io/v1alpha1';
  kind: 'Wallet';
  metadata: {
    name: string;
    namespace: string;
    generation?: number;
    resourceVersion?: string;
    uid?: string;
    creationTimestamp?: string;
  };
  spec: WalletSpec;
  status?: WalletStatus;
}
