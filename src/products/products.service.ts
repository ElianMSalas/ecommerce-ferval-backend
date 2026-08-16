import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { FindProductsDto } from './dto/findproducts.dto';
import { CreateProductDto } from './dto/createproduct.dto';
import { UpdateProductDto } from './dto/updateproduct.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // GET /products
  // Obtener productos con filtros, búsqueda y paginación
  // ============================================================

  async findAll(query: FindProductsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      sort = 'newest',
    } = query;

    const where = {
      active: true,

      // Búsqueda por nombre
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),

      // Filtro por categoría
      ...(category && {
        category: {
          slug: category,
        },
      }),

      // Filtro por marca
      ...(brand && {
        brand: {
          slug: brand,
        },
      }),

      // Filtro por rango de precio
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && {
            gte: minPrice,
          }),

          ...(maxPrice !== undefined && {
            lte: maxPrice,
          }),
        },
      }),
    };

    // ============================================================
    // Ordenamiento
    // ============================================================

    const orderBy =
      sort === 'price_asc'
        ? { price: 'asc' as const }
        : sort === 'price_desc'
          ? { price: 'desc' as const }
          : sort === 'name_asc'
            ? { name: 'asc' as const }
            : { createdAt: 'desc' as const };

    // ============================================================
    // Paginación
    // ============================================================

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,

        include: {
          category: true,
          brand: true,
          inventory: true,
          images: true,
        },

        orderBy,

        skip,
        take: limit,
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ============================================================
  // GET /products/:id
  // Obtener un producto específico
  // ============================================================

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        active: true,
      },

      include: {
        category: true,
        brand: true,
        inventory: true,
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Producto no encontrado',
      );
    }

    return product;
  }

  // ============================================================
  // POST /products
  // Crear producto
  // ============================================================

  async create(dto: CreateProductDto) {
    // ------------------------------------------------------------
    // Validar categoría
    // ------------------------------------------------------------

    const category =
      await this.prisma.category.findUnique({
        where: {
          id: dto.categoryId,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada',
      );
    }

    // ------------------------------------------------------------
    // Validar marca
    // ------------------------------------------------------------

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: {
          id: dto.brandId,
        },
      });

      if (!brand) {
        throw new NotFoundException(
          'Marca no encontrada',
        );
      }
    }

    // ------------------------------------------------------------
    // Crear producto
    // ------------------------------------------------------------

    try {
      return await this.prisma.product.create({
      data: {
        sku: dto.sku,
        barcode: dto.barcode,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        cost: dto.cost,
        vat: dto.vat ?? 19,
        categoryId: dto.categoryId,

        ...(dto.brandId && {
          brandId: dto.brandId,
        }),

        inventory: {
          create: {
            quantity: 0,
            minimumStock: 5,
            location: 'Bodega principal',
          },
        },
      },

        include: {
          category: true,
          brand: true,
          inventory: true,
          images: true,
        },
      });
    } catch (error) {
      // ----------------------------------------------------------
      // Constraint UNIQUE
      // ----------------------------------------------------------

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El SKU, slug o código de barras ya existe',
        );
      }

      throw error;
    }
  }

  // ============================================================
  // PATCH /products/:id
  // Actualizar producto
  // ============================================================

  async update(
    id: string,
    dto: UpdateProductDto,
  ) {
    // ------------------------------------------------------------
    // Verificar que exista el producto
    // ------------------------------------------------------------

    const existingProduct =
      await this.prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existingProduct) {
      throw new NotFoundException(
        'Producto no encontrado',
      );
    }

    // ------------------------------------------------------------
    // Validar categoría si viene en el request
    // ------------------------------------------------------------

    if (dto.categoryId) {
      const category =
        await this.prisma.category.findUnique({
          where: {
            id: dto.categoryId,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Categoría no encontrada',
        );
      }
    }

    // ------------------------------------------------------------
    // Validar marca si viene en el request
    // ------------------------------------------------------------

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: {
          id: dto.brandId,
        },
      });

      if (!brand) {
        throw new NotFoundException(
          'Marca no encontrada',
        );
      }
    }

    // ------------------------------------------------------------
    // Actualizar producto
    // ------------------------------------------------------------

    try {
      return await this.prisma.product.update({
        where: {
          id,
        },

        data: {
          ...(dto.sku !== undefined && {
            sku: dto.sku,
          }),

          ...(dto.barcode !== undefined && {
            barcode: dto.barcode,
          }),

          ...(dto.name !== undefined && {
            name: dto.name,
          }),

          ...(dto.slug !== undefined && {
            slug: dto.slug,
          }),

          ...(dto.description !== undefined && {
            description: dto.description,
          }),

          ...(dto.price !== undefined && {
            price: dto.price,
          }),

          ...(dto.cost !== undefined && {
            cost: dto.cost,
          }),

          ...(dto.vat !== undefined && {
            vat: dto.vat,
          }),

          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId,
          }),

          ...(dto.brandId !== undefined && {
            brandId: dto.brandId,
          }),
        },

        include: {
          category: true,
          brand: true,
          inventory: true,
          images: true,
        },
      });
    } catch (error) {
      // ----------------------------------------------------------
      // Constraint UNIQUE
      // ----------------------------------------------------------

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El SKU, slug o código de barras ya existe',
        );
      }

      throw error;
    }
  }
}