import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { SiweMessage } from 'siwe';
import { QueryFailedError } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponse, AuthenticatedUser, JwtPayload } from './auth.types';
import { SiweNonceStore } from './siwe-nonce.store';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly nonces: SiweNonceStore,
  ) {}

  issueSiweNonce(): string {
    return this.nonces.issue();
  }

  async verifySiweAndIssueToken(
    message: string,
    signature: string,
  ): Promise<AuthResponse> {
    const siwe = new SiweMessage(message);
    const expectedDomain = this.config.getOrThrow<string>('SIWE_DOMAIN');

    let walletAddress: string;
    try {
      const result = await siwe.verify({
        signature,
        domain: expectedDomain,
      });
      if (!result.success) {
        throw new UnauthorizedException('Invalid SIWE signature');
      }
      walletAddress = result.data.address.toLowerCase();
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid SIWE message or signature');
    }

    if (!this.nonces.consume(siwe.nonce)) {
      throw new UnauthorizedException('Nonce is invalid or expired');
    }

    let user = await this.users.findByWalletAddress(walletAddress);
    if (!user) {
      try {
        user = await this.users.createWithWallet(walletAddress);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          user = await this.users.findByWalletAddress(walletAddress);
        } else {
          throw err;
        }
      }
    }
    if (!user) {
      throw new UnauthorizedException('Failed to resolve wallet user');
    }
    return this.buildResponse(user);
  }

  async registerWithPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    let user: User;
    try {
      user = await this.users.createWithPassword(email, passwordHash);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
    return this.buildResponse(user);
  }

  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildResponse(user);
  }

  buildResponse(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.toAuthenticatedUser(user),
    };
  }

  toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}
