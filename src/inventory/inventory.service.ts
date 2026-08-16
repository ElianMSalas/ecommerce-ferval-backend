import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InventoryMovementType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { AdjustInventoryDto } from './dto/adjustinventory.dto';
import { PurchaseInventoryDto } from './dto/purchaseinventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // Obtener inventario de un producto
  // ============================================================

  async findByProduct(productId: string) {
    const inventory =
      await this.prisma.inventory.findUnique({
        where: {
          productId,
        },

        include: {
          product: true,
        },
      });

    if (!inventory) {
      throw new NotFoundException(
        'Inventario no encontrado',
      );
    }

    return inventory;
  }

  // ============================================================
  // Registrar compra / entrada de stock
  // ============================================================

  async purchase(
    productId: string,
    dto: PurchaseInventoryDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inventory =
        await tx.inventory.findUnique({
          where: {
            productId,
          },
        });

      if (!inventory) {
        throw new NotFoundException(
          'Inventario no encontrado',
        );
      }

      const previousQuantity =
        inventory.quantity;

      const newQuantity =
        previousQuantity + dto.quantity;

      const updatedInventory =
        await tx.inventory.update({
          where: {
            id: inventory.id,
          },

          data: {
            quantity: newQuantity,
          },
        });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,

          type: InventoryMovementType.PURCHASE,

          quantity: dto.quantity,

          previousQuantity,

          newQuantity,

          reason: dto.reason,

          referenceId: dto.referenceId,
        },
      });

      return updatedInventory;
    });
  }

  // ============================================================
  // Ajuste manual de inventario
  // ============================================================

  async adjust(
    productId: string,
    dto: AdjustInventoryDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inventory =
        await tx.inventory.findUnique({
          where: {
            productId,
          },
        });

      if (!inventory) {
        throw new NotFoundException(
          'Inventario no encontrado',
        );
      }

      const previousQuantity =
        inventory.quantity;

      const newQuantity =
        dto.quantity;

      const updatedInventory =
        await tx.inventory.update({
          where: {
            id: inventory.id,
          },

          data: {
            quantity: newQuantity,
          },
        });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,

          type: InventoryMovementType.ADJUSTMENT,

          quantity:
            newQuantity - previousQuantity,

          previousQuantity,

          newQuantity,

          reason: dto.reason,
        },
      });

      return updatedInventory;
    });
  }

  // ============================================================
  // Historial de movimientos
  // ============================================================

  async getMovements(productId: string) {
    const inventory =
      await this.prisma.inventory.findUnique({
        where: {
          productId,
        },
      });

    if (!inventory) {
      throw new NotFoundException(
        'Inventario no encontrado',
      );
    }

    return this.prisma.inventoryMovement.findMany({
      where: {
        inventoryId: inventory.id,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}