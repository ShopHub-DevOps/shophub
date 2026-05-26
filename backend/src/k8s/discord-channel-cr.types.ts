// TypeScript mirror of api/v1alpha1/discordchannel_types.go in shop-operator.
// Kept in sync manually until we share a contract via OpenAPI codegen.

export type DiscordSeverity = 'info' | 'warning' | 'critical';
export type DiscordChannelPhase =
  | 'Pending'
  | 'Ready'
  | 'Failed'
  | 'Terminating';

export interface DiscordWebhookSecretRef {
  name: string;
  key?: string;
}

export interface DiscordChannelSpec {
  channelName: string;
  webhookSecretRef: DiscordWebhookSecretRef;
  shopRef?: string;
  minSeverity?: DiscordSeverity;
}

export interface DiscordChannelCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  observedGeneration?: number;
  lastTransitionTime?: string;
}

export interface DiscordChannelStatus {
  phase?: DiscordChannelPhase;
  lastValidatedAt?: string;
  conditions?: DiscordChannelCondition[];
  observedGeneration?: number;
}

export interface DiscordChannelCR {
  apiVersion: 'shophub.io/v1alpha1';
  kind: 'DiscordChannel';
  metadata: {
    name: string;
    namespace: string;
    generation?: number;
    resourceVersion?: string;
    uid?: string;
    creationTimestamp?: string;
  };
  spec: DiscordChannelSpec;
  status?: DiscordChannelStatus;
}
