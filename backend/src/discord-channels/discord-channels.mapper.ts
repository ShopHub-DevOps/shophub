import { DiscordChannelSpec } from '../k8s/discord-channel-cr.types';
import { DiscordChannel } from './entities/discord-channel.entity';

/**
 * Translates a DiscordChannel database row plus the (optional) k8s name of
 * the linked Shop into the spec the operator expects.
 */
export function discordChannelEntityToCRSpec(
  channel: DiscordChannel,
  shopK8sName: string | null,
): DiscordChannelSpec {
  const spec: DiscordChannelSpec = {
    channelName: channel.channelName,
    webhookSecretRef: { name: channel.secretName, key: 'url' },
    minSeverity: channel.minSeverity,
  };
  if (shopK8sName) {
    spec.shopRef = shopK8sName;
  }
  return spec;
}
