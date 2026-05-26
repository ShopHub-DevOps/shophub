import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDiscordChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  channelName!: string;

  /**
   * Discord webhook URL. Never persisted to the platform DB - the service
   * writes it to a Kubernetes Secret and stores only the Secret name.
   */
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(512)
  webhookUrl!: string;

  /**
   * Optional. When set, alerts are scoped to this Shop. The Shop must belong
   * to the authenticated user.
   */
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'] as const)
  minSeverity?: 'info' | 'warning' | 'critical';
}
