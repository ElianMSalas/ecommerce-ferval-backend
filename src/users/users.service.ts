import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // Buscar por email
  // ============================================================

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  // ============================================================
  // Buscar por ID
  // ============================================================

  async findById(id: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado',
      );
    }

    return user;
  }

  // ============================================================
  // Crear usuario
  // ============================================================

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const existingUser =
      await this.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException(
        'El email ya está registrado',
      );
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });
  }

  // ============================================================
  // Usuario público
  // ============================================================

  sanitizeUser(user: any) {
    const {
      passwordHash,
      ...safeUser
    } = user;

    return safeUser;
  }
}