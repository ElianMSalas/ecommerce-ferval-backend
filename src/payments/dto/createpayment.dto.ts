import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description:
      'URL a la que Transbank retornará después del proceso de pago.',
    example:
      'http://localhost:3000/payments/return',
  })
  @IsString()
  @IsUrl({
    require_tld: false,
  })
  returnUrl: string;
}