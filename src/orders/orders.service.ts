import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryMovementType,
  OrderStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateOrderDto } from './dto/createorder.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREATE ORDER
  // ============================================================

  async create(
    userId: string,
    dto: CreateOrderDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // ======================================================
        // 1. OBTENER CARRITO
        // ======================================================

        const cart =
          await tx.cart.findUnique({
            where: {
              userId,
            },

            include: {
              items: {
                include: {
                  product: {
                    include: {
                      inventory: true,
                    },
                  },
                },
              },
            },
          });

        if (!cart) {
          throw new BadRequestException(
            'El carrito no existe',
          );
        }

        if (cart.items.length === 0) {
          throw new BadRequestException(
            'El carrito está vacío',
          );
        }

        // ======================================================
        // 2. DIRECCIÓN
        // ======================================================

        let address:
          | Awaited<
              ReturnType<
                typeof tx.address.findFirst
              >
            >
          | null = null;

        if (dto.addressId) {
          address =
            await tx.address.findFirst({
              where: {
                id: dto.addressId,
                userId,
              },
            });

          if (!address) {
            throw new NotFoundException(
              'Dirección no encontrada',
            );
          }
        }

        // ======================================================
        // 3. PREPARAR ORDER ITEMS
        // ======================================================

        type OrderItemData = {
          productId: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
          productName: string;
          productSku: string;
        };

        const orderItems: OrderItemData[] =
          [];

        let subtotal = 0;

        // ======================================================
        // 4. VALIDAR PRODUCTOS Y STOCK
        // ======================================================

        for (const item of cart.items) {
          const product = item.product;

          // ----------------------------------------------------
          // Producto activo
          // ----------------------------------------------------

          if (!product.active) {
            throw new BadRequestException(
              `El producto "${product.name}" no está disponible`,
            );
          }

          // ----------------------------------------------------
          // Inventario
          // ----------------------------------------------------

          if (!product.inventory) {
            throw new BadRequestException(
              `El producto "${product.name}" no tiene inventario`,
            );
          }

          // ----------------------------------------------------
          // Stock disponible
          // ----------------------------------------------------

          const availableStock =
            product.inventory.quantity -
            product.inventory.reservedQuantity;

          if (
            availableStock <
            item.quantity
          ) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.name}". Disponible: ${availableStock}`,
            );
          }

          // ----------------------------------------------------
          // Precio REAL desde la base de datos
          // ----------------------------------------------------

          const unitPrice =
            product.price;

          const itemSubtotal =
            unitPrice * item.quantity;

          subtotal += itemSubtotal;

          // ----------------------------------------------------
          // Snapshot histórico
          // ----------------------------------------------------

          orderItems.push({
            productId: product.id,

            quantity: item.quantity,

            unitPrice,

            subtotal: itemSubtotal,

            productName:
              product.name,

            productSku:
              product.sku,
          });
        }

        // ======================================================
        // 5. COSTO DE DESPACHO
        // ======================================================

        const shippingCost = 0;

        // ======================================================
        // 6. DESCUENTO
        // ======================================================

        const discount = 0;

        // ======================================================
        // 7. IVA
        // ======================================================

        const tax = Math.round(
          subtotal * 19 / 119,
        );

        // ======================================================
        // 8. TOTAL
        // ======================================================

        const total =
          subtotal +
          shippingCost -
          discount;

        // ======================================================
        // 9. GENERAR NÚMERO DE PEDIDO
        // ======================================================

        const orderNumber =
          await this.generateOrderNumber(
            tx,
          );

        // ======================================================
        // 10. CREAR ORDER
        // ======================================================

        const order =
          await tx.order.create({
            data: {
              orderNumber,

              userId,

              status:
                OrderStatus.PENDING_PAYMENT,

              subtotal,

              shippingCost,

              discount,

              tax,

              total,

              items: {
                create: orderItems,
              },

              ...(address
                ? {
                    shipment: {
                      create: {
                        status:
                          'PENDING',

                        street:
                          address.street,

                        number:
                          address.number,

                        apartment:
                          address.apartment,

                        commune:
                          address.commune,

                        city:
                          address.city,

                        region:
                          address.region,
                      },
                    },
                  }
                : {}),
            },

            include: {
              items: true,
              shipment: true,
            },
          });

        // ======================================================
        // 11. RESERVAR INVENTARIO
        // ======================================================

        for (const item of cart.items) {
          const inventory =
            item.product.inventory;

          if (!inventory) {
            throw new BadRequestException(
              `Inventario no encontrado para "${item.product.name}"`,
            );
          }

          // ----------------------------------------------------
          // Actualización atómica
          // ----------------------------------------------------

          const result =
            await tx.inventory.updateMany({
              where: {
                id: inventory.id,

                // Volvemos a comprobar el stock
                // disponible dentro de la transacción.
                quantity: {
                  gte:
                    inventory.reservedQuantity +
                    item.quantity,
                },

                reservedQuantity:
                  inventory.reservedQuantity,
              },

              data: {
                reservedQuantity: {
                  increment:
                    item.quantity,
                },
              },
            });

          // ----------------------------------------------------
          // Si no se actualizó ninguna fila,
          // otro proceso ganó la carrera.
          // ----------------------------------------------------

          if (result.count !== 1) {
            throw new BadRequestException(
              `El stock de "${item.product.name}" ya no está disponible`,
            );
          }

          // ----------------------------------------------------
          // Registrar movimiento
          // ----------------------------------------------------

          await tx.inventoryMovement.create({
            data: {
              inventoryId:
                inventory.id,

              type:
                InventoryMovementType.RESERVATION,

              quantity:
                item.quantity,

              previousQuantity:
                inventory.reservedQuantity,

              newQuantity:
                inventory.reservedQuantity +
                item.quantity,

              reason:
                `Reserva para pedido ${order.orderNumber}`,

              referenceId:
                order.id,
            },
          });
        }

        // ======================================================
        // 12. CREAR PAYMENT
        // ======================================================

        await tx.payment.create({
          data: {
            orderId: order.id,

            provider: 'TRANSBANK',

            status: 'PENDING',

            amount: total,
          },
        });

        // ======================================================
        // 13. LIMPIAR CARRITO
        // ======================================================

        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });

        // ======================================================
        // 14. RETORNAR PEDIDO
        // ======================================================

        return tx.order.findUnique({
          where: {
            id: order.id,
          },

          include: {
            items: true,
            payment: true,
            shipment: true,
          },
        });
      },
    );
  }

  // ============================================================
  // GENERATE ORDER NUMBER
  // ============================================================

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ) {
    const timestamp =
      Date.now();

    const random =
      Math.floor(
        Math.random() * 1000,
      )
        .toString()
        .padStart(3, '0');

    const orderNumber =
      `FER-${timestamp}-${random}`;

    // Verificación adicional
    const existing =
      await tx.order.findUnique({
        where: {
          orderNumber,
        },
      });

    if (existing) {
      return this.generateOrderNumber(
        tx,
      );
    }

    return orderNumber;
  }

  // ============================================================
  // FIND ALL USER ORDERS
  // ============================================================

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: {
        userId,
      },

      include: {
        items: true,
        payment: true,
        shipment: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // FIND ONE USER ORDER
  // ============================================================

  async findOne(
    userId: string,
    id: string,
  ) {
    const order =
      await this.prisma.order.findFirst({
        where: {
          id,
          userId,
        },

        include: {
          items: true,
          payment: true,
          shipment: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Pedido no encontrado',
      );
    }

    return order;
  }
}