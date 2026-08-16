import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { InventoryService } from './inventory.service';

import { AdjustInventoryDto } from './dto/adjustinventory.dto';
import { PurchaseInventoryDto } from './dto/purchaseinventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  // ============================================================
  // GET /inventory/:productId
  // ============================================================

  @Get(':productId')
  findByProduct(
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.findByProduct(
      productId,
    );
  }

  // ============================================================
  // POST /inventory/:productId/purchase
  // ============================================================

  @Post(':productId/purchase')
  purchase(
    @Param('productId') productId: string,
    @Body() dto: PurchaseInventoryDto,
  ) {
    return this.inventoryService.purchase(
      productId,
      dto,
    );
  }

  // ============================================================
  // GET /inventory/:productId/movements
  // ============================================================

  @Get(':productId/movements')
  getMovements(
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getMovements(
      productId,
    );
  }
  // ============================================================
  // POST /inventory/:productId/adjust
  // ============================================================

  @Post(':productId/adjust')
  adjust(
    @Param('productId') productId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjust(
      productId,
      dto,
    );
  }
}