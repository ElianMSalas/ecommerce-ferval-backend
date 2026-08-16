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

import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { CurrentUser } from '../auth/decorators/currentuser.decorator';

import { CartService } from './cart.service';

import { AddCartItemDto } from './dto/addcartitem.dto';
import { UpdateCartItemDto } from './dto/updatecartitem.dto';

@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
  ) {}

  // ============================================================
  // GET /cart
  // ============================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findCart(
    @CurrentUser('id') userId: string,
  ) {
    return this.cartService.findCart(userId);
  }

  // ============================================================
  // POST /cart/items
  // ============================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('items')
  addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(
      userId,
      dto,
    );
  }
  
// ============================================================
// PATCH /cart/items/:productId
// ============================================================

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Patch('items/:productId')
updateItem(
  @CurrentUser('id') userId: string,
  @Param('productId') productId: string,
  @Body() dto: UpdateCartItemDto,
) {
  return this.cartService.updateItem(
    userId,
    productId,
    dto,
  );
}

// ============================================================
// DELETE /cart/items/:productId
// ============================================================

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Delete('items/:productId')
removeItem(
  @CurrentUser('id') userId: string,
  @Param('productId') productId: string,
) {
  return this.cartService.removeItem(
    userId,
    productId,
  );
}

// ============================================================
// DELETE /cart
// ============================================================

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Delete()
clearCart(
  @CurrentUser('id') userId: string,
) {
  return this.cartService.clearCart(
    userId,
  );
}
}
