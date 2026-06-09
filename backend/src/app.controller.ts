import { Controller, Get } from '@nestjs/common';
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

  @Get('/metrics')
  async metrics() {
    return register.metrics();
  }
}
