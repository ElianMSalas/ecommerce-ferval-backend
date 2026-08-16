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

import { OrdersService } from './orders.service';

import { CreateOrderDto } from './dto/createorder.dto';

import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { CurrentUser } from '../auth/decorators/currentuser.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  // ============================================================
  // POST /orders
  // ============================================================

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(
      userId,
      dto,
    );
  }

  // ============================================================
  // GET /orders
  // ============================================================

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.findAll(
      userId,
    );
  }

  // ============================================================
  // GET /orders/:id
  // ============================================================

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOne(
      userId,
      id,
    );
  }
}