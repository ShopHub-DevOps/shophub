'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  DiscordChannel,
  discordPhaseColorClass,
} from '@/lib/discord-channel-types';

export default function DiscordChannelsListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [channels, setChannels] = useState<DiscordChannel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const refresh = () => {
      api
        .listDiscordChannels()
        .then(setChannels)
        .catch((err) => {
          if (err instanceof ApiError) setError(err.message);
          else setError('Failed to load Discord channels');
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
            Discord channels
          </h1>
          <Link
            href="/discord-channels/new"
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            + New channel
          </Link>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {channels === null ? (
          <p className="text-sm text-zinc-500">Loading channels...</p>
        ) : channels.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              No Discord channels yet. Add one to receive alerts.
            </p>
            <Link
              href="/discord-channels/new"
              className="inline-block rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Create your first channel
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/discord-channels/${channel.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                        {channel.channelName}
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {channel.shopId
                          ? 'Scoped to one shop'
                          : 'All shops in namespace'}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${discordPhaseColorClass(channel.lastKnownPhase)}`}
                    >
                      {channel.lastKnownPhase ?? 'Pending'}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                    <span>severity ≥ {channel.minSeverity}</span>
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
