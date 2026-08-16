import 'dotenv/config';

import {
  PrismaClient,
  UserRole,
  InventoryMovementType,
} from '@prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';

import * as argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL no está definida',
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('============================================');
  console.log('INICIANDO SEED');
  console.log('============================================');

  // ============================================================
  // 1. LIMPIAR BASE DE DATOS
  // ============================================================

  console.log('\n[1/10] Limpiando base de datos...');

  // Primero tablas que dependen de otras
  await prisma.inventoryMovement.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.shipment.deleteMany();

  // Luego tablas intermedias
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.address.deleteMany();
  await prisma.cart.deleteMany();

  // Orders
  await prisma.order.deleteMany();

  // Productos
  await prisma.product.deleteMany();

  // Entidades independientes
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();

  console.log('Base de datos limpiada.');

  // ============================================================
  // 2. PASSWORDS
  // ============================================================

  console.log('\n[2/10] Generando passwords...');

  const customerPassword = await argon2.hash(
    'Customer123!',
  );

  const adminPassword = await argon2.hash(
    'Admin123!',
  );

  // ============================================================
  // 3. USUARIOS
  // ============================================================

  console.log('\n[3/10] Creando usuarios...');

  const customer = await prisma.user.create({
    data: {
      email: 'cliente@test.cl',
      passwordHash: customerPassword,

      firstName: 'Juan',
      lastName: 'Pérez',

      phone: '+56911111111',

      role: UserRole.CUSTOMER,
      active: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.cl',
      passwordHash: adminPassword,

      firstName: 'Administrador',
      lastName: 'Ferval',

      phone: '+56922222222',

      role: UserRole.ADMIN,
      active: true,
    },
  });

  console.log(`Cliente creado: ${customer.email}`);
  console.log(`Admin creado: ${admin.email}`);

  // ============================================================
  // 4. DIRECCIONES
  // ============================================================

  console.log('\n[4/10] Creando direcciones...');

  const address = await prisma.address.create({
    data: {
      userId: customer.id,

      name: 'Casa',

      street: 'Avenida Providencia',
      number: '1234',
      apartment: '501',

      commune: 'Providencia',
      city: 'Santiago',
      region: 'Región Metropolitana',

      postalCode: '7500000',

      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,

      name: 'Oficina',

      street: 'Avenida Apoquindo',
      number: '3000',

      commune: 'Las Condes',
      city: 'Santiago',
      region: 'Región Metropolitana',

      postalCode: '7550000',

      isDefault: false,
    },
  });

  // ============================================================
  // 5. CATEGORÍAS
  // ============================================================

  console.log('\n[5/10] Creando categorías...');

  const herramientas = await prisma.category.create({
    data: {
      name: 'Herramientas',
      slug: 'herramientas',
      description:
        'Herramientas manuales y eléctricas.',
      active: true,
    },
  });

  const herramientasElectricas =
    await prisma.category.create({
      data: {
        name: 'Herramientas Eléctricas',
        slug: 'herramientas-electricas',
        description:
          'Herramientas eléctricas profesionales.',
        active: true,
      },
    });

  const seguridad = await prisma.category.create({
    data: {
      name: 'Seguridad',
      slug: 'seguridad',
      description:
        'Elementos de seguridad y protección.',
      active: true,
    },
  });

  // ============================================================
  // 6. MARCAS
  // ============================================================

  console.log('\n[6/10] Creando marcas...');

  const bosch = await prisma.brand.create({
    data: {
      name: 'Bosch',
      slug: 'bosch',
      description:
        'Herramientas profesionales Bosch.',
      active: true,
    },
  });

  const makita = await prisma.brand.create({
    data: {
      name: 'Makita',
      slug: 'makita',
      description:
        'Herramientas eléctricas Makita.',
      active: true,
    },
  });

  const dewalt = await prisma.brand.create({
    data: {
      name: 'DeWalt',
      slug: 'dewalt',
      description:
        'Herramientas profesionales DeWalt.',
      active: true,
    },
  });

  // ============================================================
  // 7. PRODUCTOS
  // ============================================================

  console.log('\n[7/10] Creando productos...');

  const taladro = await prisma.product.create({
    data: {
      sku: 'BOSCH-GSB-001',
      barcode: '780000000001',

      name: 'Taladro Percutor Bosch',
      slug: 'taladro-percutor-bosch',

      description:
        'Taladro percutor Bosch para trabajos profesionales.',

      price: 89990,
      cost: 60000,

      vat: 19,

      active: true,

      categoryId:
        herramientasElectricas.id,

      brandId: bosch.id,

      images: {
        create: [
          {
            url:
              'https://placehold.co/800x800?text=Taladro+Bosch',

            altText:
              'Taladro Percutor Bosch',

            position: 0,
            isPrimary: true,
          },
        ],
      },

      inventory: {
        create: {
          quantity: 10,

          reservedQuantity: 0,

          minimumStock: 2,

          location: 'Bodega principal',
        },
      },
    },

    include: {
      inventory: true,
    },
  });

  const atornillador =
    await prisma.product.create({
      data: {
        sku: 'MAKITA-AT-001',
        barcode: '780000000002',

        name: 'Atornillador Inalámbrico Makita',
        slug: 'atornillador-inalambrico-makita',

        description:
          'Atornillador inalámbrico Makita profesional.',

        price: 129990,
        cost: 85000,

        vat: 19,

        active: true,

        categoryId:
          herramientasElectricas.id,

        brandId: makita.id,

        images: {
          create: [
            {
              url:
                'https://placehold.co/800x800?text=Makita',

              altText:
                'Atornillador Inalámbrico Makita',

              position: 0,

              isPrimary: true,
            },
          ],
        },

        inventory: {
          create: {
            quantity: 15,

            reservedQuantity: 0,

            minimumStock: 3,

            location: 'Bodega principal',
          },
        },
      },

      include: {
        inventory: true,
      },
    });

  const esmeril =
    await prisma.product.create({
      data: {
        sku: 'DEWALT-ESM-001',
        barcode: '780000000003',

        name: 'Esmeril Angular DeWalt',
        slug: 'esmeril-angular-dewalt',

        description:
          'Esmeril angular DeWalt para trabajos profesionales.',

        price: 109990,
        cost: 70000,

        vat: 19,

        active: true,

        categoryId:
          herramientasElectricas.id,

        brandId: dewalt.id,

        images: {
          create: [
            {
              url:
                'https://placehold.co/800x800?text=DeWalt',

              altText:
                'Esmeril Angular DeWalt',

              position: 0,

              isPrimary: true,
            },
          ],
        },

        inventory: {
          create: {
            quantity: 8,

            reservedQuantity: 0,

            minimumStock: 2,

            location: 'Bodega principal',
          },
        },
      },

      include: {
        inventory: true,
      },
    });

  const martillo =
    await prisma.product.create({
      data: {
        sku: 'FERV-MAN-001',
        barcode: '780000000004',

        name: 'Martillo Profesional',
        slug: 'martillo-profesional',

        description:
          'Martillo profesional para trabajos generales.',

        price: 19990,
        cost: 10000,

        vat: 19,

        active: true,

        categoryId:
          herramientas.id,

        brandId: bosch.id,

        inventory: {
          create: {
            quantity: 25,

            reservedQuantity: 0,

            minimumStock: 5,

            location: 'Bodega principal',
          },
        },
      },

      include: {
        inventory: true,
      },
    });

  const casco =
    await prisma.product.create({
      data: {
        sku: 'FERV-SEG-001',
        barcode: '780000000005',

        name: 'Casco de Seguridad',
        slug: 'casco-de-seguridad',

        description:
          'Casco de seguridad para trabajos industriales.',

        price: 12990,
        cost: 6000,

        vat: 19,

        active: true,

        categoryId:
          seguridad.id,

        brandId: dewalt.id,

        inventory: {
          create: {
            quantity: 30,

            reservedQuantity: 0,

            minimumStock: 10,

            location: 'Bodega principal',
          },
        },
      },

      include: {
        inventory: true,
      },
    });

  console.log(
    `Productos creados: 5`,
  );

  // ============================================================
  // 8. MOVIMIENTOS DE INVENTARIO
  // ============================================================

  console.log(
    '\n[8/10] Creando movimientos de inventario...',
  );

  const products = [
    taladro,
    atornillador,
    esmeril,
    martillo,
    casco,
  ];

  for (const product of products) {
    if (!product.inventory) {
      continue;
    }

    await prisma.inventoryMovement.create({
      data: {
        inventoryId:
          product.inventory.id,

        type:
          InventoryMovementType.PURCHASE,

        quantity:
          product.inventory.quantity,

        previousQuantity: 0,

        newQuantity:
          product.inventory.quantity,

        reason:
          'Carga inicial de inventario',

        referenceId: null,
      },
    });
  }

  // ============================================================
  // 9. CARRITO
  // ============================================================

  console.log('\n[9/10] Creando carrito de prueba...');

  const cart = await prisma.cart.create({
    data: {
      userId: customer.id,

      items: {
        create: [
          {
            productId: taladro.id,
            quantity: 2,
          },

          {
            productId: martillo.id,
            quantity: 1,
          },
        ],
      },
    },

    include: {
      items: true,
    },
  });

  // Evitar warning de variable no utilizada
  console.log(
    `Carrito creado con ${cart.items.length} productos.`,
  );

  // ============================================================
  // 10. DATOS DE RESUMEN
  // ============================================================

  console.log('\n============================================');
  console.log('SEED COMPLETADO CORRECTAMENTE');
  console.log('============================================');

  console.log('\nUSUARIO CUSTOMER');
  console.log('Email: cliente@test.cl');
  console.log('Password: Customer123!');
  console.log(`ID: ${customer.id}`);

  console.log('\nUSUARIO ADMIN');
  console.log('Email: admin@test.cl');
  console.log('Password: Admin123!');
  console.log(`ID: ${admin.id}`);

  console.log('\nDIRECCIÓN');
  console.log(`ID: ${address.id}`);

  console.log('\nPRODUCTOS');
  console.log(`Taladro: ${taladro.id}`);
  console.log(`Atornillador: ${atornillador.id}`);
  console.log(`Esmeril: ${esmeril.id}`);
  console.log(`Martillo: ${martillo.id}`);
  console.log(`Casco: ${casco.id}`);

  console.log('\n============================================');
  console.log('DATOS LISTOS PARA PRUEBAS');
  console.log('============================================');
}

main()
  .catch((error) => {
    console.error(
      '\nERROR EJECUTANDO SEED:',
    );

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });