import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { AddressesService } from './addresses.service';

import { CreateAddressDto } from './dto/createaddress.dto';
import { UpdateAddressDto } from './dto/updateaddress.dto';

import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { CurrentUser } from '../auth/decorators/currentuser.decorator';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
  ) {}

  // ============================================================
  // POST /addresses
  // ============================================================

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(
      userId,
      dto,
    );
  }

  // ============================================================
  // GET /addresses
  // ============================================================

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
  ) {
    return this.addressesService.findAll(
      userId,
    );
  }

  // ============================================================
  // GET /addresses/:id
  // ============================================================

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.findOne(
      userId,
      id,
    );
  }

  // ============================================================
  // PATCH /addresses/:id
  // ============================================================

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(
      userId,
      id,
      dto,
    );
  }

  // ============================================================
  // DELETE /addresses/:id
  // ============================================================

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.remove(
      userId,
      id,
    );
  }
}