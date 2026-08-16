import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateProductDto {
  // ============================================================
  // SKU
  // ============================================================

  @ApiProperty({
    description: 'Código interno del producto.',
    example: 'TAL-BOS-001',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  // ============================================================
  // BARCODE
  // ============================================================

  @ApiPropertyOptional({
    description: 'Código de barras del producto.',
    example: '7801234567890',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  // ============================================================
  // NAME
  // ============================================================

  @ApiProperty({
    description: 'Nombre del producto.',
    example: 'Taladro Bosch Professional 13mm',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  // ============================================================
  // SLUG
  // ============================================================

  @ApiProperty({
    description: 'Slug único del producto.',
    example: 'taladro-bosch-professional-13mm',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @ApiPropertyOptional({
    description: 'Descripción del producto.',
    example:
      'Taladro profesional de 13mm para trabajos de construcción.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  // ============================================================
  // PRICE
  // ============================================================

  @ApiProperty({
    description: 'Precio de venta en pesos chilenos.',
    example: 89990,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  price: number;

  // ============================================================
  // COST
  // ============================================================

  @ApiPropertyOptional({
    description: 'Costo del producto en pesos chilenos.',
    example: 55000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  // ============================================================
  // VAT
  // ============================================================

  @ApiPropertyOptional({
    description: 'IVA del producto.',
    example: 19,
    default: 19,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  vat?: number;

  // ============================================================
  // CATEGORY
  // ============================================================

  @ApiProperty({
    description: 'ID de la categoría.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  categoryId: string;

  // ============================================================
  // BRAND
  // ============================================================

  @ApiPropertyOptional({
    description: 'ID de la marca.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;
}