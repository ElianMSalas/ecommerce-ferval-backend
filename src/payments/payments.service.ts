import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Environment,
  Options,
  WebpayPlus,
} from 'transbank-sdk';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly webpay: InstanceType<
    typeof WebpayPlus.Transaction
  >;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    const commerceCode =
      process.env.TRANSBANK_COMMERCE_CODE;

    const apiKey =
      process.env.TRANSBANK_API_KEY;

    if (!commerceCode) {
      throw new Error(
        'TRANSBANK_COMMERCE_CODE no está definida',
      );
    }

    if (!apiKey) {
      throw new Error(
        'TRANSBANK_API_KEY no está definida',
      );
    }

    const options = new Options(
      commerceCode,
      apiKey,
      Environment.Integration,
    );

    this.webpay =
      new WebpayPlus.Transaction(
        options,
      );
  }

  // ============================================================
  // CREATE TRANSACTION
  // ============================================================

  async createTransaction(
    userId: string,
    orderId: string,
    returnUrl: string,
  ) {
    // ----------------------------------------------------------
    // Buscar pedido
    // ----------------------------------------------------------

    const order =
      await this.prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },

        include: {
          payment: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Pedido no encontrado',
      );
    }

    // ----------------------------------------------------------
    // Validar estado del pedido
    // ----------------------------------------------------------

    if (
      order.status !==
      'PENDING_PAYMENT'
    ) {
      throw new BadRequestException(
        'El pedido no está pendiente de pago',
      );
    }

    // ----------------------------------------------------------
    // Validar Payment
    // ----------------------------------------------------------

    if (!order.payment) {
      throw new BadRequestException(
        'El pedido no tiene un pago asociado',
      );
    }

    if (
      order.payment.status !==
      'PENDING'
    ) {
      throw new BadRequestException(
        'El pago ya fue procesado',
      );
    }

    // ----------------------------------------------------------
    // Generar buyOrder
    // ----------------------------------------------------------

    const buyOrder =
      order.orderNumber;

    // ----------------------------------------------------------
    // Generar sessionId
    // ----------------------------------------------------------

    const sessionId = order.orderNumber;

    // ----------------------------------------------------------
    // Crear transacción en Transbank
    // ----------------------------------------------------------

    const response =
      await this.webpay.create(
        buyOrder,
        sessionId,
        order.total,
        returnUrl,
      );

    // ----------------------------------------------------------
    // Guardar token
    // ----------------------------------------------------------

    await this.prisma.payment.update({
      where: {
        orderId: order.id,
      },

      data: {
        token: response.token,
      },
    });

    // ----------------------------------------------------------
    // Respuesta
    // ----------------------------------------------------------

    return {
      orderId: order.id,

      orderNumber:
        order.orderNumber,

      amount: order.total,

      token:
        response.token,

      url:
        response.url,
    };
  }

  // ============================================================
  // COMMIT TRANSACTION
  // ============================================================

  async commitTransaction(
    token: string,
  ) {
    // ----------------------------------------------------------
    // Validar token
    // ----------------------------------------------------------

    if (!token) {
      throw new BadRequestException(
        'Token de Transbank no recibido',
      );
    }

    // ----------------------------------------------------------
    // Buscar Payment
    // ----------------------------------------------------------

    const payment =
      await this.prisma.payment.findFirst({
        where: {
          token,
        },

        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Pago no encontrado',
      );
    }

    // ----------------------------------------------------------
    // Evitar doble procesamiento
    // ----------------------------------------------------------

    if (
      payment.status ===
      'APPROVED'
    ) {
      return {
        success: true,

        message:
          'El pago ya fue procesado',

        orderId:
          payment.orderId,

        orderNumber:
          payment.order.orderNumber,
      };
    }

    // ----------------------------------------------------------
    // Commit en Transbank
    // ----------------------------------------------------------

    const response =
      await this.webpay.commit(
        token,
      );

    // ----------------------------------------------------------
    // Determinar si fue aprobado
    // ----------------------------------------------------------

    const approved =
      response.response_code === 0 &&
      response.status ===
        'AUTHORIZED';

    // ==========================================================
    // PAGO RECHAZADO
    // ==========================================================

    if (!approved) {
      await this.prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------------
          // Payment
          // ----------------------------------------------------

          await tx.payment.update({
            where: {
              id: payment.id,
            },

            data: {
              status: 'REJECTED',
            },
          });

          // ----------------------------------------------------
          // Order
          // ----------------------------------------------------

          await tx.order.update({
            where: {
              id: payment.orderId,
            },

            data: {
              status: 'CANCELLED',
            },
          });

          // ----------------------------------------------------
          // Liberar reserva
          // ----------------------------------------------------

          for (
            const item of payment.order.items
          ) {
            const inventory =
              await tx.inventory.findUnique({
                where: {
                  productId:
                    item.productId,
                },
              });

            if (!inventory) {
              continue;
            }

            await tx.inventory.update({
              where: {
                id: inventory.id,
              },

              data: {
                reservedQuantity: {
                  decrement:
                    item.quantity,
                },
              },
            });

            await tx.inventoryMovement.create({
              data: {
                inventoryId:
                  inventory.id,

                type: 'RELEASE',

                quantity:
                  item.quantity,

                previousQuantity:
                  inventory.reservedQuantity,

                newQuantity:
                  inventory.reservedQuantity -
                  item.quantity,

                reason:
                  `Liberación de reserva del pedido ${payment.order.orderNumber}`,

                referenceId:
                  payment.orderId,
              },
            });
          }
        },
      );

      return {
        success: false,

        status:
          response.status,

        responseCode:
          response.response_code,

        orderId:
          payment.orderId,

        orderNumber:
          payment.order.orderNumber,
      };
    }

    // ==========================================================
    // PAGO APROBADO
    // ==========================================================

    await this.prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // Payment
        // ------------------------------------------------------

        await tx.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: 'APPROVED',

            transactionId:
              response.buy_order,

            authorizationCode:
              response.authorization_code,

            paymentType:
              response.payment_type_code,

            paidAt:
              new Date(),
          },
        });

        // ------------------------------------------------------
        // Order
        // ------------------------------------------------------

        await tx.order.update({
          where: {
            id: payment.orderId,
          },

          data: {
            status: 'PAID',
          },
        });

        // ------------------------------------------------------
        // Inventario
        // ------------------------------------------------------

        for (
          const item of payment.order.items
        ) {
          const inventory =
            await tx.inventory.findUnique({
              where: {
                productId:
                  item.productId,
              },
            });

          if (!inventory) {
            throw new BadRequestException(
              `Inventario no encontrado para ${item.productName}`,
            );
          }

          // ----------------------------------------------------
          // Validar stock
          // ----------------------------------------------------

          if (
            inventory.quantity <
            item.quantity
          ) {
            throw new BadRequestException(
              `Stock insuficiente para ${item.productName}`,
            );
          }

          // ----------------------------------------------------
          // Validar reserva
          // ----------------------------------------------------

          if (
            inventory.reservedQuantity <
            item.quantity
          ) {
            throw new BadRequestException(
              `Reserva insuficiente para ${item.productName}`,
            );
          }

          // ----------------------------------------------------
          // Descontar inventario
          // ----------------------------------------------------

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },

            data: {
              quantity: {
                decrement:
                  item.quantity,
              },

              reservedQuantity: {
                decrement:
                  item.quantity,
              },
            },
          });

          // ----------------------------------------------------
          // Registrar movimiento
          // ----------------------------------------------------

          await tx.inventoryMovement.create({
            data: {
              inventoryId:
                inventory.id,

              type: 'SALE',

              quantity:
                item.quantity,

              previousQuantity:
                inventory.quantity,

              newQuantity:
                inventory.quantity -
                item.quantity,

              reason:
                `Venta del pedido ${payment.order.orderNumber}`,

              referenceId:
                payment.orderId,
            },
          });
        }
      },
    );

    // ==========================================================
    // RESPUESTA
    // ==========================================================

    return {
      success: true,

      status:
        response.status,

      responseCode:
        response.response_code,

      orderId:
        payment.orderId,

      orderNumber:
        payment.order.orderNumber,
    };
  }
}