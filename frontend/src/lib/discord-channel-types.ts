export type DiscordSeverity = 'info' | 'warning' | 'critical';
export type DiscordChannelPhase =
  | 'Pending'
  | 'Ready'
  | 'Failed'
  | 'Terminating';

export interface DiscordChannel {
  id: string;
  userId: string;
  shopId: string | null;
  k8sName: string;
  secretName: string;
  channelName: string;
  minSeverity: DiscordSeverity;
  lastKnownPhase: DiscordChannelPhase | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscordChannelRequest {
  channelName: string;
  webhookUrl: string;
  shopId?: string;
  minSeverity?: DiscordSeverity;
}

export interface UpdateDiscordChannelRequest {
  channelName?: string;
  webhookUrl?: string;
  shopId?: string | null;
  minSeverity?: DiscordSeverity;
}

export function discordPhaseColorClass(phase: DiscordChannelPhase | null): string {
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
