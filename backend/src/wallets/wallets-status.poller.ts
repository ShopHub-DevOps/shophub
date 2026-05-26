import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WalletsService } from './wallets.service';

@Injectable()
export class WalletsStatusPoller {
  private readonly logger = new Logger(WalletsStatusPoller.name);

  constructor(private readonly wallets: WalletsService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweep(): Promise<void> {
    try {
      await this.wallets.syncAllStatuses();
    } catch (err) {
      this.logger.warn(
        `Status sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
