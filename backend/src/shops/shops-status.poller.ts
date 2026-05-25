import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShopsService } from './shops.service';

@Injectable()
export class ShopsStatusPoller {
  private readonly logger = new Logger(ShopsStatusPoller.name);

  constructor(private readonly shops: ShopsService) {}

  // Every 15 seconds is responsive enough for the panel without hammering
  // the API server. Will be replaced by an informer/watch later.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweep(): Promise<void> {
    try {
      await this.shops.syncAllStatuses();
    } catch (err) {
      this.logger.warn(
        `Status sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
