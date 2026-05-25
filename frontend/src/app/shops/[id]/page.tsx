'use client';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  AvailabilityTier,
  DatabaseTier,
  Shop,
  phaseColorClass,
} from '@/lib/shop-types';

interface EditableFields {
  displayName: string;
  availability: AvailabilityTier;
  databaseTier: DatabaseTier;
  walletAddress: string;
  chainId: number;
}

const editInputClass =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export default function ShopDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const id = params.id;

  const fetchShop = useCallback(() => {
    api
      .getShop(id)
      .then(setShop)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Shop not found');
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load shop');
        }
      });
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchShop();
    const interval = setInterval(() => {
      if (!editing) fetchShop();
    }, 5000);
    return () => clearInterval(interval);
  }, [authLoading, user, router, fetchShop, editing]);

  const onDelete = async () => {
    if (!shop) return;
    if (!window.confirm(`Delete "${shop.displayName}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteShop(shop.id);
      router.push('/shops');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete shop');
      setDeleting(false);
    }
  };

  if (authLoading || !user) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }
  if (error && !shop) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!shop) {
    return <div className="p-8 text-zinc-500">Loading shop...</div>;
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        <div className="mb-2 text-sm text-zinc-500">
          <button
            type="button"
            onClick={() => router.push('/shops')}
            className="underline"
          >
            ← All shops
          </button>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
              {shop.displayName}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {shop.host}
            </p>
          </div>
          <span
            className={`rounded px-3 py-1 text-sm font-medium ${phaseColorClass(shop.lastKnownPhase)}`}
          >
            {shop.lastKnownPhase ?? 'Pending'}
          </span>
        </div>

        {editing ? (
          <EditPanel
            shop={shop}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setShop(updated);
              setEditing(false);
            }}
            onError={setError}
            externalError={error}
          />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 rounded border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Field label="External URL">
                {shop.lastKnownUrl ? (
                  <a
                    href={shop.lastKnownUrl}
                    className="break-all text-blue-600 underline dark:text-blue-400"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shop.lastKnownUrl}
                  </a>
                ) : (
                  <span className="text-zinc-500">(not ready yet)</span>
                )}
              </Field>
              <Field label="Availability">{shop.availability}</Field>
              <Field label="Database tier">{shop.databaseTier}</Field>
              <Field label="Wallet">
                <span className="break-all font-mono text-xs">
                  {shop.walletAddress}
                </span>
              </Field>
              <Field label="Chain ID">{shop.chainId}</Field>
              <Field label="Created">
                {new Date(shop.createdAt).toLocaleString()}
              </Field>
              <Field label="K8s name">
                <span className="font-mono text-xs">{shop.k8sName}</span>
              </Field>
            </dl>

            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
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
                {deleting ? 'Deleting...' : 'Delete shop'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditPanel({
  shop,
  onCancel,
  onSaved,
  onError,
  externalError,
}: {
  shop: Shop;
  onCancel: () => void;
  onSaved: (updated: Shop) => void;
  onError: (msg: string | null) => void;
  externalError: string | null;
}) {
  const [draft, setDraft] = useState<EditableFields>({
    displayName: shop.displayName,
    availability: shop.availability,
    databaseTier: shop.databaseTier,
    walletAddress: shop.walletAddress,
    chainId: Number(shop.chainId),
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      const updated = await api.updateShop(shop.id, draft);
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
        <Field label="External URL">
          {shop.lastKnownUrl ? (
            <a
              href={shop.lastKnownUrl}
              className="break-all text-blue-600 underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              {shop.lastKnownUrl}
            </a>
          ) : (
            <span className="text-zinc-500">(not ready yet)</span>
          )}
        </Field>
        <Field label="Display name">
          <input
            type="text"
            required
            maxLength={80}
            value={draft.displayName}
            onChange={(e) =>
              setDraft({ ...draft, displayName: e.target.value })
            }
            className={editInputClass}
          />
        </Field>
        <Field label="Availability">
          <select
            value={draft.availability}
            onChange={(e) =>
              setDraft({
                ...draft,
                availability: e.target.value as AvailabilityTier,
              })
            }
            className={editInputClass}
          >
            <option value="standard">standard (2 replicas)</option>
            <option value="high">high (3 replicas)</option>
          </select>
        </Field>
        <Field label="Database tier">
          <select
            value={draft.databaseTier}
            onChange={(e) =>
              setDraft({
                ...draft,
                databaseTier: e.target.value as DatabaseTier,
              })
            }
            className={editInputClass}
          >
            <option value="standard">standard (Postgres)</option>
            <option value="light">light (Redis)</option>
          </select>
        </Field>
        <Field label="Wallet">
          <input
            type="text"
            required
            pattern="^0x[a-fA-F0-9]{40}$"
            value={draft.walletAddress}
            onChange={(e) =>
              setDraft({ ...draft, walletAddress: e.target.value })
            }
            className={`${editInputClass} font-mono`}
          />
        </Field>
        <Field label="Chain ID">
          <input
            type="number"
            min={1}
            value={draft.chainId}
            onChange={(e) =>
              setDraft({ ...draft, chainId: Number(e.target.value) })
            }
            className={editInputClass}
          />
        </Field>
        <Field label="Host (read-only)">
          <span className="text-zinc-500">{shop.host}</span>
        </Field>
        <Field label="K8s name (read-only)">
          <span className="font-mono text-xs text-zinc-500">{shop.k8sName}</span>
        </Field>
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
