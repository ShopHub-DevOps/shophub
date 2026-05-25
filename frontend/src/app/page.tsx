'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-start gap-8 px-8 py-24">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          ShopHub
        </h1>
        <p className="max-w-md text-base text-zinc-600 dark:text-zinc-400">
          Deploy your own shop to Kubernetes. Sign in to manage your shop sites,
          wallets, and notifications.
        </p>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading session...</p>
        ) : user ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Signed in as{' '}
              <span className="font-medium">
                {user.email ?? user.walletAddress}
              </span>
            </p>
            <div className="flex gap-3">
              <Link
                href="/shops"
                className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                My shops
              </Link>
              <button
                onClick={logout}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded bg-foreground px-5 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-white/[.04]"
            >
              Register
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
