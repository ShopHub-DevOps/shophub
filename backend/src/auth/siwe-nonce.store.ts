import { Injectable } from '@nestjs/common';
import { generateNonce } from 'siwe';

const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceEntry {
  expiresAt: number;
}

/**
 * In-memory nonce store for SIWE login. Single-process only - sufficient
 * for the local demo and tests. A multi-replica deploy would swap this
 * for Redis or a short-lived DB row.
 */
@Injectable()
export class SiweNonceStore {
  private readonly nonces = new Map<string, NonceEntry>();

  issue(): string {
    this.purgeExpired();
    const nonce = generateNonce();
    this.nonces.set(nonce, { expiresAt: Date.now() + NONCE_TTL_MS });
    return nonce;
  }

  consume(nonce: string): boolean {
    const entry = this.nonces.get(nonce);
    if (!entry) {
      return false;
    }
    this.nonces.delete(nonce);
    return entry.expiresAt > Date.now();
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [nonce, entry] of this.nonces) {
      if (entry.expiresAt <= now) {
        this.nonces.delete(nonce);
      }
    }
  }
}
