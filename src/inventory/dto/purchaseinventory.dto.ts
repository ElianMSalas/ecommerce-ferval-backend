import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class PurchaseInventoryDto {
  @ApiProperty({
    description: 'Cantidad recibida.',
    example: 20,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Referencia de la compra o documento asociado.',
    example: 'OC-2026-00125',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Motivo u observación.',
    example: 'Recepción de compra proveedor',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}