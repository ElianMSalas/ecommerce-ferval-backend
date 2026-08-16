import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({
    example: 'Casa',
    description: 'Nombre identificador de la dirección.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Av. Providencia',
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({
    example: 'Depto 501',
  })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({
    example: 'Providencia',
  })
  @IsString()
  @IsNotEmpty()
  commune: string;

  @ApiProperty({
    example: 'Santiago',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    example: 'Región Metropolitana',
  })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiPropertyOptional({
    example: '7500000',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}