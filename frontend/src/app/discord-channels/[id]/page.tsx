'use client';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  DiscordChannel,
  DiscordSeverity,
  discordPhaseColorClass,
} from '@/lib/discord-channel-types';
import { Shop } from '@/lib/shop-types';

const editInputClass =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export default function DiscordChannelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [channel, setChannel] = useState<DiscordChannel | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const id = params.id;

  const fetchChannel = useCallback(() => {
    api
      .getDiscordChannel(id)
      .then(setChannel)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Channel not found');
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load channel');
        }
      });
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchChannel();
    api.listShops().then(setShops).catch(() => undefined);
    const interval = setInterval(() => {
      if (!editing) fetchChannel();
    }, 5000);
    return () => clearInterval(interval);
  }, [authLoading, user, router, fetchChannel, editing]);

  const onDelete = async () => {
    if (!channel) return;
    if (!window.confirm(`Delete channel "${channel.channelName}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteDiscordChannel(channel.id);
      router.push('/discord-channels');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete channel');
      setDeleting(false);
    }
  };

  if (authLoading || !user) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }
  if (error && !channel) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!channel) {
    return <div className="p-8 text-zinc-500">Loading channel...</div>;
  }

  const attachedShop = shops.find((s) => s.id === channel.shopId);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        <div className="mb-2 text-sm text-zinc-500">
          <button
            type="button"
            onClick={() => router.push('/discord-channels')}
            className="underline"
          >
            ← All channels
          </button>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
              {channel.channelName}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {attachedShop
                ? `Scoped to ${attachedShop.displayName}`
                : 'All shops in namespace'}
            </p>
          </div>
          <span
            className={`rounded px-3 py-1 text-sm font-medium ${discordPhaseColorClass(channel.lastKnownPhase)}`}
          >
            {channel.lastKnownPhase ?? 'Pending'}
          </span>
        </div>

        {editing ? (
          <EditPanel
            channel={channel}
            shops={shops}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setChannel(updated);
              setEditing(false);
            }}
            onError={setError}
            externalError={error}
          />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 rounded border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Field label="Minimum severity">{channel.minSeverity}</Field>
              <Field label="Attached shop">
                {attachedShop ? attachedShop.displayName : 'all shops'}
              </Field>
              <Field label="Secret">
                <span className="font-mono text-xs">{channel.secretName}</span>
              </Field>
              <Field label="Created">
                {new Date(channel.createdAt).toLocaleString()}
              </Field>
              <Field label="K8s name">
                <span className="font-mono text-xs">{channel.k8sName}</span>
              </Field>
            </dl>

            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditing(true);
                }}
                className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-white/[.04]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete channel'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditPanel({
  channel,
  shops,
  onCancel,
  onSaved,
  onError,
  externalError,
}: {
  channel: DiscordChannel;
  shops: Shop[];
  onCancel: () => void;
  onSaved: (updated: DiscordChannel) => void;
  onError: (msg: string | null) => void;
  externalError: string | null;
}) {
  const [channelName, setChannelName] = useState(channel.channelName);
  const [minSeverity, setMinSeverity] = useState<DiscordSeverity>(
    channel.minSeverity,
  );
  const [shopId, setShopId] = useState<string>(channel.shopId ?? '');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      const updated = await api.updateDiscordChannel(channel.id, {
        channelName,
        minSeverity,
        shopId: shopId === '' ? null : shopId,
        ...(webhookUrl ? { webhookUrl } : {}),
      });
      onSaved(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Channel name">
          <input
            type="text"
            required
            maxLength={80}
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className={editInputClass}
          />
        </Field>
        <Field label="Minimum severity">
          <select
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value as DiscordSeverity)}
            className={editInputClass}
          >
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
          </select>
        </Field>
        <Field label="Attached shop">
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className={editInputClass}
          >
            <option value="">All my shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.displayName} ({shop.host})
              </option>
            ))}
          </select>
        </Field>
        <Field label="K8s name (read-only)">
          <span className="font-mono text-xs text-zinc-500">{channel.k8sName}</span>
        </Field>
        <div className="col-span-2">
          <Field label="Rotate webhook URL (optional)">
            <input
              type="url"
              pattern="https://.*"
              placeholder="Leave blank to keep the current URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className={`${editInputClass} font-mono text-xs`}
            />
          </Field>
        </div>
      </div>

      {externalError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {externalError}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 text-black dark:text-zinc-100">{children}</dd>
    </div>
  );
}
