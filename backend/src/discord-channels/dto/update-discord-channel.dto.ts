import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

// k8sName and secretName are immutable after creation - they identify
// cluster objects that the operator already references.
export class UpdateDiscordChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  channelName?: string;

  /**
   * Optional new webhook URL. When supplied, the platform rotates the
   * underlying Kubernetes Secret. Omitting it leaves the existing webhook in
   * place.
   */
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(512)
  webhookUrl?: string;

  /**
   * Null clears the shop binding (channel becomes namespace-wide). Undefined
   * leaves it unchanged.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  shopId?: string | null;

  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'] as const)
  minSeverity?: 'info' | 'warning' | 'critical';
}
