import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { AddCartItemDto } from './dto/addcartitem.dto';
import { UpdateCartItemDto } from './dto/updatecartitem.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // OBTENER O CREAR CARRITO
  // ============================================================

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
      });
    }

    return cart;
  }

  // ============================================================
  // OBTENER CARRITO
  // ============================================================

  async findCart(userId: string) {
    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },

        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true,
                  inventory: true,
                  images: true,
                },
              },
            },

            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

    if (!cart) {
      return {
        id: null,
        items: [],
        subtotal: 0,
        totalItems: 0,
      };
    }

    return this.buildCartResponse(cart);
  }

  // ============================================================
  // AGREGAR PRODUCTO
  // ============================================================

  async addItem(
    userId: string,
    dto: AddCartItemDto,
  ) {
    const product =
      await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          active: true,
        },

        include: {
          inventory: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Producto no encontrado',
      );
    }

    if (!product.inventory) {
      throw new BadRequestException(
        'El producto no tiene inventario configurado',
      );
    }

    if (
      product.inventory.quantity <
      dto.quantity
    ) {
      throw new BadRequestException(
        `Stock insuficiente. Stock disponible: ${product.inventory.quantity}`,
      );
    }

    const cart =
      await this.getOrCreateCart(userId);

    const existingItem =
      await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: dto.productId,
          },
        },
      });

    const newQuantity =
      existingItem
        ? existingItem.quantity + dto.quantity
        : dto.quantity;

    if (
      newQuantity >
      product.inventory.quantity
    ) {
      throw new BadRequestException(
        `Stock insuficiente. Stock disponible: ${product.inventory.quantity}`,
      );
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },

      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },

      update: {
        quantity: newQuantity,
      },
    });

    return this.findCart(userId);
  }

  // ============================================================
  // ACTUALIZAR CANTIDAD
  // ============================================================

  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },
      });

    if (!cart) {
      throw new NotFoundException(
        'Carrito no encontrado',
      );
    }

    const item =
      await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },

        include: {
          product: {
            include: {
              inventory: true,
            },
          },
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Producto no encontrado en el carrito',
      );
    }

    if (!item.product.active) {
      throw new BadRequestException(
        'El producto ya no está disponible',
      );
    }

    if (!item.product.inventory) {
      throw new BadRequestException(
        'El producto no tiene inventario configurado',
      );
    }

    if (
      dto.quantity >
      item.product.inventory.quantity
    ) {
      throw new BadRequestException(
        `Stock insuficiente. Stock disponible: ${item.product.inventory.quantity}`,
      );
    }

    await this.prisma.cartItem.update({
      where: {
        id: item.id,
      },

      data: {
        quantity: dto.quantity,
      },
    });

    return this.findCart(userId);
  }

  // ============================================================
  // ELIMINAR PRODUCTO
  // ============================================================

  async removeItem(
    userId: string,
    productId: string,
  ) {
    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },
      });

    if (!cart) {
      throw new NotFoundException(
        'Carrito no encontrado',
      );
    }

    const item =
      await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Producto no encontrado en el carrito',
      );
    }

    await this.prisma.cartItem.delete({
      where: {
        id: item.id,
      },
    });

    return this.findCart(userId);
  }

  // ============================================================
  // VACIAR CARRITO
  // ============================================================

  async clearCart(userId: string) {
    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },
      });

    if (!cart) {
      return {
        message: 'Carrito vacío',
      };
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return {
      message: 'Carrito vaciado correctamente',
    };
  }

  // ============================================================
  // CONSTRUIR RESPUESTA
  // ============================================================

  private buildCartResponse(cart: any) {
    let subtotal = 0;
    let totalItems = 0;

    const items = cart.items.map((item) => {
      const itemSubtotal =
        item.product.price *
        item.quantity;

      subtotal += itemSubtotal;

      totalItems += item.quantity;

      return {
        id: item.id,

        product: {
          id: item.product.id,
          sku: item.product.sku,
          name: item.product.name,
          slug: item.product.slug,
          price: item.product.price,
          image:
            item.product.images.find(
              (image) => image.isPrimary,
            )?.url ??
            item.product.images[0]?.url ??
            null,
        },

        quantity: item.quantity,

        unitPrice: item.product.price,

        subtotal: itemSubtotal,

        availableStock:
          item.product.inventory
            ?.quantity ?? 0,
      };
    });

    return {
      id: cart.id,

      items,

      subtotal,

      totalItems,
    };
  }
}