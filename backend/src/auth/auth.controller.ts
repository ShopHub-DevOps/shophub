import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthResponse } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SiweVerifyDto } from './dto/siwe-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User): AuthenticatedUser {
    return this.auth.toAuthenticatedUser(user);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.registerWithPassword(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.loginWithPassword(dto.email, dto.password);
  }

  @Get('siwe/nonce')
  siweNonce(): { nonce: string } {
    return { nonce: this.auth.issueSiweNonce() };
  }

  @Post('siwe/verify')
  @HttpCode(HttpStatus.OK)
  siweVerify(@Body() dto: SiweVerifyDto): Promise<AuthResponse> {
    return this.auth.verifySiweAndIssueToken(dto.message, dto.signature);
  }
}
