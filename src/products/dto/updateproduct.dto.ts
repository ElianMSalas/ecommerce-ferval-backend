import { PartialType } from '@nestjs/swagger';

import { CreateProductDto } from './createproduct.dto';

export class UpdateProductDto extends PartialType(
  CreateProductDto,
) {}