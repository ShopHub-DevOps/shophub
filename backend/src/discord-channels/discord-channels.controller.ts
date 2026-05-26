import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateDiscordChannelDto } from './dto/create-discord-channel.dto';
import { UpdateDiscordChannelDto } from './dto/update-discord-channel.dto';
import { DiscordChannel } from './entities/discord-channel.entity';
import { DiscordChannelsService } from './discord-channels.service';

@Controller('discord-channels')
@UseGuards(JwtAuthGuard)
export class DiscordChannelsController {
  constructor(private readonly channels: DiscordChannelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateDiscordChannelDto,
  ): Promise<DiscordChannel> {
    return this.channels.createForUser(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User): Promise<DiscordChannel[]> {
    return this.channels.findAllForUser(user.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DiscordChannel> {
    return this.channels.findOneForUser(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscordChannelDto,
  ): Promise<DiscordChannel> {
    return this.channels.updateForUser(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.channels.deleteForUser(user.id, id);
  }
}
