import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordChannelsService } from './discord-channels.service';

@Injectable()
export class DiscordChannelsStatusPoller {
  private readonly logger = new Logger(DiscordChannelsStatusPoller.name);

  constructor(private readonly channels: DiscordChannelsService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweep(): Promise<void> {
    try {
      await this.channels.syncAllStatuses();
    } catch (err) {
      this.logger.warn(
        `Status sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
