import {
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description:
      'ID de la dirección de despacho.',
    example:
      '7e4b7e2e-4a9e-4b5a-9f2a-123456789abc',
  })
  @IsOptional()
  @IsString()
  addressId?: string;
}