import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';

import { PaymentsService } from './payments.service';

import { CreatePaymentDto } from './dto/createpayment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  // ============================================================
  // TRANSBANK RETURN - GET
  // ============================================================

  @Get('return')
  @ApiOperation({
    summary: 'Retorno GET de Transbank Webpay',
  })
  async handleReturnGet(
    @Req() req: Request,
  ) {
    const token =
      req.query.token_ws as string;

    return this.paymentsService.commitTransaction(
      token,
    );
  }

  // ============================================================
  // TRANSBANK RETURN - POST
  // ============================================================

  @Post('return')
  @ApiOperation({
    summary: 'Retorno POST de Transbank Webpay',
  })
  async handleReturnPost(
    @Body('token_ws') token: string,
  ) {
    return this.paymentsService.commitTransaction(
      token,
    );
  }

  // ============================================================
  // CREATE TRANSBANK TRANSACTION
  // ============================================================

  @Post(':orderId/create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Crear transacción de pago Transbank',
  })
  createTransaction(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    const userId =
      (req.user as any).id;

    return this.paymentsService.createTransaction(
      userId,
      orderId,
      dto.returnUrl,
    );
  }
}