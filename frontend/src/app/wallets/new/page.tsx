'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { WalletPurpose } from '@/lib/wallet-types';

export default function NewWalletPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState(11155111);
  const [purpose, setPurpose] = useState<WalletPurpose>('payments');
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
      const wallet = await api.createWallet({
        displayName,
        address,
        chainId,
        purpose,
      });
      router.push(`/wallets/${wallet.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create wallet');
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
          Add wallet
        </h1>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Display name</span>
          <input
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Main payments wallet"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Address (EVM)</span>
          <input
            type="text"
            required
            pattern="^0x[a-fA-F0-9]{40}$"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0xabc..."
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="block text-xs text-zinc-500">
            Paste an existing wallet address. Address and chain are immutable
            after creation.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block space-y-1">
            <span className="text-zinc-700 dark:text-zinc-300">Chain ID</span>
            <input
              type="number"
              min={1}
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <span className="block text-xs text-zinc-500">
              Default 11155111 (Sepolia).
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-zinc-700 dark:text-zinc-300">Purpose</span>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as WalletPurpose)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="payments">payments (receive buyer funds)</option>
              <option value="payout">payout (platform payouts to you)</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded bg-foreground py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {submitting ? 'Adding...' : 'Add wallet'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/wallets')}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
