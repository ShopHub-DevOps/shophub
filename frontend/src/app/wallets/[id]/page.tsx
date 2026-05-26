'use client';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Wallet,
  WalletPurpose,
  walletPhaseColorClass,
} from '@/lib/wallet-types';

const editInputClass =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export default function WalletDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const id = params.id;

  const fetchWallet = useCallback(() => {
    api
      .getWallet(id)
      .then(setWallet)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Wallet not found');
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load wallet');
        }
      });
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchWallet();
    const interval = setInterval(() => {
      if (!editing) fetchWallet();
    }, 5000);
    return () => clearInterval(interval);
  }, [authLoading, user, router, fetchWallet, editing]);

  const onDelete = async () => {
    if (!wallet) return;
    if (!window.confirm(`Delete wallet "${wallet.displayName}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteWallet(wallet.id);
      router.push('/wallets');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete wallet');
      setDeleting(false);
    }
  };

  if (authLoading || !user) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }
  if (error && !wallet) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!wallet) {
    return <div className="p-8 text-zinc-500">Loading wallet...</div>;
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        <div className="mb-2 text-sm text-zinc-500">
          <button
            type="button"
            onClick={() => router.push('/wallets')}
            className="underline"
          >
            ← All wallets
          </button>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
              {wallet.displayName}
            </h1>
            <p className="mt-1 break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {wallet.address}
            </p>
          </div>
          <span
            className={`ml-3 shrink-0 rounded px-3 py-1 text-sm font-medium ${walletPhaseColorClass(wallet.lastKnownPhase)}`}
          >
            {wallet.lastKnownPhase ?? 'Pending'}
          </span>
        </div>

        {editing ? (
          <EditPanel
            wallet={wallet}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setWallet(updated);
              setEditing(false);
            }}
            onError={setError}
            externalError={error}
          />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 rounded border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Field label="Purpose">{wallet.purpose}</Field>
              <Field label="Chain ID">{wallet.chainId}</Field>
              <Field label="Created">
                {new Date(wallet.createdAt).toLocaleString()}
              </Field>
              <Field label="K8s name">
                <span className="font-mono text-xs">{wallet.k8sName}</span>
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
                {deleting ? 'Deleting...' : 'Delete wallet'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditPanel({
  wallet,
  onCancel,
  onSaved,
  onError,
  externalError,
}: {
  wallet: Wallet;
  onCancel: () => void;
  onSaved: (updated: Wallet) => void;
  onError: (msg: string | null) => void;
  externalError: string | null;
}) {
  const [displayName, setDisplayName] = useState(wallet.displayName);
  const [purpose, setPurpose] = useState<WalletPurpose>(wallet.purpose);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      const updated = await api.updateWallet(wallet.id, {
        displayName,
        purpose,
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
        <Field label="Display name">
          <input
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={editInputClass}
          />
        </Field>
        <Field label="Purpose">
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as WalletPurpose)}
            className={editInputClass}
          >
            <option value="payments">payments</option>
            <option value="payout">payout</option>
          </select>
        </Field>
        <Field label="Address (read-only)">
          <span className="break-all font-mono text-xs text-zinc-500">
            {wallet.address}
          </span>
        </Field>
        <Field label="Chain ID (read-only)">
          <span className="text-zinc-500">{wallet.chainId}</span>
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
