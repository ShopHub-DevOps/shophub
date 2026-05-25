export interface AuthResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  walletAddress: string | null;
}

export interface JwtPayload {
  sub: string;
}
