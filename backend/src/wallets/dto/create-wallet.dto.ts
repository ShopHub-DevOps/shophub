import {
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsEthereumAddress()
  address!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  chainId?: number;

  @IsOptional()
  @IsEnum(['payments', 'payout'] as const)
  purpose?: 'payments' | 'payout';
}
