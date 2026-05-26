import { authStorage, StoredUser } from './auth-storage';
import {
  CreateDiscordChannelRequest,
  DiscordChannel,
  UpdateDiscordChannelRequest,
} from './discord-channel-types';
import { CreateShopRequest, Shop, UpdateShopRequest } from './shop-types';
import {
  CreateWalletRequest,
  UpdateWalletRequest,
  Wallet,
} from './wallet-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export interface AuthResponse {
  accessToken: string;
  user: StoredUser;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = authStorage.getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    authStorage.clear();
  }

  let body: unknown = undefined;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body as { message?: string } | undefined)?.message ?? res.statusText;
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}

export const api = {
  register(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  siweNonce(): Promise<{ nonce: string }> {
    return request<{ nonce: string }>('/auth/siwe/nonce');
  },
  siweVerify(message: string, signature: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/siwe/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
  },
  me(): Promise<StoredUser> {
    return request<StoredUser>('/auth/me');
  },
  listShops(): Promise<Shop[]> {
    return request<Shop[]>('/shops');
  },
  getShop(id: string): Promise<Shop> {
    return request<Shop>(`/shops/${id}`);
  },
  createShop(payload: CreateShopRequest): Promise<Shop> {
    return request<Shop>('/shops', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateShop(id: string, payload: UpdateShopRequest): Promise<Shop> {
    return request<Shop>(`/shops/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteShop(id: string): Promise<void> {
    return request<void>(`/shops/${id}`, { method: 'DELETE' });
  },
  listDiscordChannels(): Promise<DiscordChannel[]> {
    return request<DiscordChannel[]>('/discord-channels');
  },
  getDiscordChannel(id: string): Promise<DiscordChannel> {
    return request<DiscordChannel>(`/discord-channels/${id}`);
  },
  createDiscordChannel(
    payload: CreateDiscordChannelRequest,
  ): Promise<DiscordChannel> {
    return request<DiscordChannel>('/discord-channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateDiscordChannel(
    id: string,
    payload: UpdateDiscordChannelRequest,
  ): Promise<DiscordChannel> {
    return request<DiscordChannel>(`/discord-channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteDiscordChannel(id: string): Promise<void> {
    return request<void>(`/discord-channels/${id}`, { method: 'DELETE' });
  },
  listWallets(): Promise<Wallet[]> {
    return request<Wallet[]>('/wallets');
  },
  getWallet(id: string): Promise<Wallet> {
    return request<Wallet>(`/wallets/${id}`);
  },
  createWallet(payload: CreateWalletRequest): Promise<Wallet> {
    return request<Wallet>('/wallets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateWallet(id: string, payload: UpdateWalletRequest): Promise<Wallet> {
    return request<Wallet>(`/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteWallet(id: string): Promise<void> {
    return request<void>(`/wallets/${id}`, { method: 'DELETE' });
  },
};
