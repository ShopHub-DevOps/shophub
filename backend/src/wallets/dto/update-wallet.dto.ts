import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// address and chainId are immutable after creation - a wallet's identity is
// its (address, chainId) pair. Users who want a different address create a
// new Wallet record.
export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsEnum(['payments', 'payout'] as const)
  purpose?: 'payments' | 'payout';
}
