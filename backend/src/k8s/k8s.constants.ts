export const SHOP_CR_GROUP = 'shophub.io';
export const SHOP_CR_VERSION = 'v1alpha1';
export const SHOP_CR_PLURAL = 'shops';
export const SHOP_CR_NAMESPACE = 'shophub-tenants';

// DiscordChannel and Wallet share the same group/version as Shop. They live
// in the tenant namespace alongside the Shop CRs they reference.
export const DISCORD_CHANNEL_CR_PLURAL = 'discordchannels';
export const WALLET_CR_PLURAL = 'wallets';
