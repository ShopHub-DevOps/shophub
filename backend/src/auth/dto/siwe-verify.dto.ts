import { IsString, MaxLength, MinLength } from 'class-validator';

export class SiweVerifyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  message!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  signature!: string;
}
