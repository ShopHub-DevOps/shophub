'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { SiweMessage } from 'siwe';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

type Mode = 'password' | 'wallet';

export default function LoginPage() {
  const router = useRouter();
  const { login, signInWithWallet } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.12] dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Sign in to ShopHub
        </h1>

        <div className="flex rounded border border-zinc-300 text-sm dark:border-zinc-700">
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setError(null);
            }}
            className={`flex-1 py-2 ${mode === 'password' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('wallet');
              setError(null);
            }}
            className={`flex-1 py-2 ${mode === 'wallet' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}
          >
            Wallet
          </button>
        </div>

        {mode === 'password' ? (
          <PasswordForm
            onSubmit={async (email, password) => {
              await login(email, password);
              router.push('/');
            }}
            onError={setError}
          />
        ) : (
          <WalletSignIn
            onSuccess={async (message, signature) => {
              await signInWithWallet(message, signature);
              router.push('/');
            }}
            onError={setError}
          />
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
          No account?{' '}
          <a href="/register" className="font-medium text-zinc-950 underline dark:text-zinc-50">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}

function PasswordForm({
  onSubmit,
  onError,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-foreground py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}

function WalletSignIn({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string, signature: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { connectors, connectAsync, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync, isPending: signPending } = useSignMessage();
  const [busy, setBusy] = useState(false);

  const injected = connectors.find((c) => c.id === 'injected') ?? connectors[0];

  const handle = async () => {
    setBusy(true);
    try {
      let acct = address;
      if (!isConnected || !acct) {
        const res = await connectAsync({ connector: injected });
        acct = res.accounts[0];
      }
      if (!acct) {
        throw new Error('No wallet account available');
      }

      const { nonce } = await api.siweNonce();
      const message = new SiweMessage({
        domain: window.location.host,
        address: acct,
        statement: 'Sign in to ShopHub',
        uri: window.location.origin,
        version: '1',
        chainId: chainId ?? 11155111,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });
      await onSuccess(prepared, signature);
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Wallet sign-in failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const pending = busy || connectPending || signPending;

  return (
    <div className="space-y-3 text-sm">
      {isConnected && address && (
        <p className="break-all text-xs text-zinc-600 dark:text-zinc-400">
          Connected: {address}
        </p>
      )}
      <button
        type="button"
        onClick={handle}
        disabled={pending || !injected}
        className="w-full rounded bg-foreground py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending
          ? 'Waiting for wallet...'
          : isConnected
            ? 'Sign message to continue'
            : 'Connect Metamask & sign'}
      </button>
      {isConnected && (
        <button
          type="button"
          onClick={() => disconnect()}
          className="w-full rounded border border-zinc-300 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}
