'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { AvailabilityTier, DatabaseTier } from '@/lib/shop-types';

export default function NewShopPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [host, setHost] = useState('');
  const [availability, setAvailability] = useState<AvailabilityTier>('standard');
  const [databaseTier, setDatabaseTier] = useState<DatabaseTier>('standard');
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState(11155111);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const shop = await api.createShop({
        displayName,
        host,
        availability,
        databaseTier,
        walletAddress,
        chainId,
      });
      router.push(`/shops/${shop.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create shop');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg space-y-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.12] dark:bg-zinc-900"
      >
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Create a shop
        </h1>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Display name</span>
          <input
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Cool Shop"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Host (DNS-1123)</span>
          <input
            type="text"
            required
            pattern="^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)+$"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="my-shop.shophub.local"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="block text-xs text-zinc-500">
            Lowercase, dots and hyphens only. Used as the Ingress hostname.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block space-y-1">
            <span className="text-zinc-700 dark:text-zinc-300">Availability</span>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as AvailabilityTier)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="standard">standard (2 replicas)</option>
              <option value="high">high (3 replicas)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-zinc-700 dark:text-zinc-300">Database tier</span>
            <select
              value={databaseTier}
              onChange={(e) => setDatabaseTier(e.target.value as DatabaseTier)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="standard">standard (Postgres / CNPG)</option>
              <option value="light">light (Redis / REDB)</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Wallet address (EVM)</span>
          <input
            type="text"
            required
            pattern="^0x[a-fA-F0-9]{40}$"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0xabc..."
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Chain ID</span>
          <input
            type="number"
            min={1}
            value={chainId}
            onChange={(e) => setChainId(Number(e.target.value))}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="block text-xs text-zinc-500">
            Default 11155111 (Sepolia testnet).
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded bg-foreground py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {submitting ? 'Creating...' : 'Create shop'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/shops')}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
