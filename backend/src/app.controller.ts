import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { register } from './observability/metrics';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  // Prometheus rejects a scrape whose Content-Type it does not recognise.
  // Returning a plain string from Nest makes Express default to text/html,
  // so the exposition format has to be declared explicitly.
  @Get('/metrics')
  @Header('Content-Type', register.contentType)
  async metrics() {
    return register.metrics();
  }
}
