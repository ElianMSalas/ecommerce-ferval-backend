import { PartialType } from '@nestjs/swagger';

import { CreateAddressDto } from './createaddress.dto';

export class UpdateAddressDto extends PartialType(
  CreateAddressDto,
) {}