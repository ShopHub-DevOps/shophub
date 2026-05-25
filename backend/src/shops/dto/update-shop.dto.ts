import {
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

// `host` and `k8sName` are immutable after creation - changing host would
// require Ingress re-routing and break in-flight customer sessions, so we
// reject it at the DTO layer rather than silently ignoring.
export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsEnum(['standard', 'high'] as const)
  availability?: 'standard' | 'high';

  @IsOptional()
  @IsEnum(['standard', 'light'] as const)
  databaseTier?: 'standard' | 'light';

  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  chainId?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  backendImage?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  frontendImage?: string | null;
}
