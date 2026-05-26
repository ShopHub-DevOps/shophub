import {
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const HOST_PATTERN =
  /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)+$/;

export class CreateShopDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsString()
  @MaxLength(253)
  @Matches(HOST_PATTERN, {
    message: 'host must be a lowercase DNS-1123 hostname',
  })
  host!: string;

  @IsEnum(['standard', 'high'] as const)
  availability!: 'standard' | 'high';

  @IsEnum(['standard', 'light'] as const)
  databaseTier!: 'standard' | 'light';

  @IsEthereumAddress()
  walletAddress!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  chainId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  backendImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  frontendImage?: string;
}
