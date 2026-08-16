import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'elian@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'MiPassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}