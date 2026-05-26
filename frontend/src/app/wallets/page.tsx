'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Wallet, walletPhaseColorClass } from '@/lib/wallet-types';

export default function WalletsListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const refresh = () => {
      api
        .listWallets()
        .then(setWallets)
        .catch((err) => {
          if (err instanceof ApiError) setError(err.message);
          else setError('Failed to load wallets');
        });
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [authLoading, user, router]);

  if (authLoading || (!user && !error)) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            My wallets
          </h1>
          <Link
            href="/wallets/new"
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            + New wallet
          </Link>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {wallets === null ? (
          <p className="text-sm text-zinc-500">Loading wallets...</p>
        ) : wallets.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              No wallets yet. Add one to receive payments or payouts.
            </p>
            <Link
              href="/wallets/new"
              className="inline-block rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Add your first wallet
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {wallets.map((wallet) => (
              <li
                key={wallet.id}
                className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/wallets/${wallet.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                        {wallet.displayName}
                      </h2>
                      <p className="break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {wallet.address}
                      </p>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded px-2 py-1 text-xs font-medium ${walletPhaseColorClass(wallet.lastKnownPhase)}`}
                    >
                      {wallet.lastKnownPhase ?? 'Pending'}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                    <span>chain: {wallet.chainId}</span>
                    <span>purpose: {wallet.purpose}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
