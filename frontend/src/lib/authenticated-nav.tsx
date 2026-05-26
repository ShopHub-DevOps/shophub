'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-context';

const tabs = [
  { href: '/shops', label: 'Shops' },
  { href: '/discord-channels', label: 'Discord channels' },
  { href: '/wallets', label: 'Wallets' },
];

/**
 * Top navigation rendered only when the user is logged in. Pages that need
 * a clean full-screen layout (login, register) still get a no-op render
 * because the user is null there.
 */
export function AuthenticatedNav() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();

  if (isLoading || !user) return null;

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-8 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/shops"
            className="text-sm font-semibold text-black dark:text-zinc-50"
          >
            ShopHub
          </Link>
          <ul className="flex gap-4 text-sm">
            {tabs.map((tab) => {
              const active =
                pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={
                      active
                        ? 'text-black underline underline-offset-4 dark:text-zinc-50'
                        : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100'
                    }
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500">{user.email ?? user.walletAddress}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-white/[.04]"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
