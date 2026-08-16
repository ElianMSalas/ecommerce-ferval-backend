import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustInventoryDto {
  @ApiProperty({
    description: 'Cantidad del ajuste de inventario.',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Motivo del ajuste.',
    example: 'Corrección por conteo físico de bodega',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}