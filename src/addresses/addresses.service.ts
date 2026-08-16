import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAddressDto } from './dto/createaddress.dto';
import { UpdateAddressDto } from './dto/updateaddress.dto';

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    userId: string,
    dto: CreateAddressDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // Si será dirección principal,
        // quitamos el default de las anteriores.
        if (dto.isDefault) {
          await tx.address.updateMany({
            where: {
              userId,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        return tx.address.create({
          data: {
            userId,

            name: dto.name,
            street: dto.street,
            number: dto.number,
            apartment: dto.apartment,

            commune: dto.commune,
            city: dto.city,
            region: dto.region,

            postalCode: dto.postalCode,

            isDefault:
              dto.isDefault ?? false,
          },
        });
      },
    );
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: {
        userId,
      },

      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(
    userId: string,
    id: string,
  ) {
    const address =
      await this.prisma.address.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!address) {
      throw new NotFoundException(
        'Dirección no encontrada',
      );
    }

    return address;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ) {
    // Primero verificamos que pertenezca
    // al usuario autenticado.
    await this.findOne(userId, id);

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.isDefault === true) {
          await tx.address.updateMany({
            where: {
              userId,
              isDefault: true,
              id: {
                not: id,
              },
            },
            data: {
              isDefault: false,
            },
          });
        }

        return tx.address.update({
          where: {
            id,
          },

          data: {
            ...(dto.name !== undefined && {
              name: dto.name,
            }),

            ...(dto.street !== undefined && {
              street: dto.street,
            }),

            ...(dto.number !== undefined && {
              number: dto.number,
            }),

            ...(dto.apartment !== undefined && {
              apartment: dto.apartment,
            }),

            ...(dto.commune !== undefined && {
              commune: dto.commune,
            }),

            ...(dto.city !== undefined && {
              city: dto.city,
            }),

            ...(dto.region !== undefined && {
              region: dto.region,
            }),

            ...(dto.postalCode !== undefined && {
              postalCode: dto.postalCode,
            }),

            ...(dto.isDefault !== undefined && {
              isDefault: dto.isDefault,
            }),
          },
        });
      },
    );
  }

  // ============================================================
  // DELETE
  // ============================================================

  async remove(
    userId: string,
    id: string,
  ) {
    const address =
      await this.findOne(userId, id);

    await this.prisma.address.delete({
      where: {
        id: address.id,
      },
    });

    return {
      message: 'Dirección eliminada correctamente',
    };
  }
}