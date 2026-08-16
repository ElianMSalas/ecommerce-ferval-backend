# Ferval E-commerce — Backend

API REST para el e-commerce de la ferretería **Ferval**, construida con [NestJS](https://nestjs.com/), [Prisma](https://www.prisma.io/) y PostgreSQL. Incluye autenticación con JWT, catálogo de productos, carrito, gestión de inventario con movimientos y reservas, órdenes y pagos integrados con **Transbank Webpay Plus**.

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura y módulos](#arquitectura-y-módulos)
- [Modelo de datos](#modelo-de-datos)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos y migraciones](#base-de-datos-y-migraciones)
- [Ejecución](#ejecución)
- [Documentación de la API (Swagger)](#documentación-de-la-api-swagger)
- [Endpoints principales](#endpoints-principales)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)

## Stack tecnológico

- **Framework:** NestJS 11 (Express)
- **ORM:** Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT (`@nestjs/jwt`, `passport-jwt`) + hash de contraseñas con `argon2`
- **Validación:** `class-validator` / `class-transformer`
- **Documentación de API:** `@nestjs/swagger`
- **Pagos:** `transbank-sdk` (Webpay Plus)

## Arquitectura y módulos

El proyecto sigue la estructura modular estándar de NestJS. Cada dominio de negocio vive en su propio módulo dentro de `src/`:

| Módulo | Responsabilidad |
|---|---|
| `auth` | Registro, login, emisión/validación de JWT, guards de autenticación y roles |
| `users` | Entidad de usuario (consumida principalmente por `auth`) |
| `products` | CRUD y búsqueda de productos, categorías y marcas |
| `inventory` | Stock por producto, compras de stock, ajustes manuales y movimientos de inventario |
| `cart` | Carrito de compras por usuario autenticado |
| `addresses` | Direcciones de despacho del usuario |
| `orders` | Creación y consulta de órdenes |
| `payments` | Integración con Transbank Webpay Plus (creación y confirmación de transacciones) |
| `prisma` | Módulo/servicio compartido que expone el cliente Prisma al resto de la app |

Todas las rutas de la API se sirven bajo el prefijo global **`/api`** (configurado en `src/main.ts`).

## Modelo de datos

El esquema (`prisma/schema.prisma`) modela un flujo completo de e-commerce:

- **User / Address** — usuarios con rol `CUSTOMER` o `ADMIN`, cada uno con múltiples direcciones.
- **Category / Brand / Product / ProductImage** — catálogo de productos con precio, costo, IVA (`vat`), SKU y código de barras únicos.
- **Inventory / InventoryMovement** — stock físico (`quantity`) y stock reservado (`reservedQuantity`) por producto, con historial de movimientos tipados (`PURCHASE`, `SALE`, `RESERVATION`, `RELEASE`, `ADJUSTMENT`, `RETURN`).
- **Cart / CartItem** — un carrito por usuario, con ítems únicos por producto.
- **Order / OrderItem** — órdenes con snapshot de nombre/SKU/precio del producto al momento de la compra, y estados (`PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`).
- **Payment** — pago asociado 1:1 a una orden, con proveedor (`TRANSBANK`) y estado (`PENDING`, `AUTHORIZED`, `APPROVED`, `REJECTED`, `CANCELLED`, `REFUNDED`).
- **Shipment** — despacho asociado 1:1 a una orden, con estado y datos de entrega.

Todos los montos monetarios se almacenan como enteros (unidad mínima de moneda, sin decimales — consistente con CLP).

## Requisitos previos

- Node.js 20+ (recomendado)
- PostgreSQL 14+ en ejecución
- npm

## Instalación

```bash
git clone <url-del-repositorio>
cd ecommerce-ferval-backend
npm install
```

## Variables de entorno

Copia el archivo de ejemplo y ajusta los valores según tu entorno:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, etc.) |
| `PORT` | Puerto donde escucha la API (por defecto `3000`) |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL, ej. `postgresql://usuario:password@localhost:5432/ferreteria?schema=public` |
| `JWT_SECRET` | Secreto usado para firmar los tokens JWT — usar un valor largo y aleatorio |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token (ej. `1d`) |
| `TRANSBANK_COMMERCE_CODE` | Código de comercio de Transbank (usar el de integración en desarrollo) |
| `TRANSBANK_API_KEY` | API key de integración/producción de Transbank |

## Base de datos y migraciones

Con `DATABASE_URL` configurado y PostgreSQL corriendo:

```bash
# Generar el cliente de Prisma
npx prisma generate

# Aplicar las migraciones existentes
npx prisma migrate deploy

# (opcional, en desarrollo) crear/aplicar migraciones nuevas
npx prisma migrate dev

# (opcional) cargar datos de ejemplo
npx tsx prisma/seed.ts
```

## Ejecución

```bash
# Modo desarrollo (watch mode)
npm run start:dev

# Modo debug
npm run start:debug

# Build de producción
npm run build
npm run start:prod
```

Por defecto la API queda disponible en `http://localhost:3000/api`.

## Documentación de la API (Swagger)

El proyecto expone documentación interactiva generada con Swagger:

```
http://localhost:3000/api/docs
```

La autenticación en Swagger usa **Bearer Token** (JWT) para los endpoints protegidos.

## Endpoints principales

Todas las rutas están bajo el prefijo `/api`. Los endpoints marcados con 🔒 requieren JWT (`Authorization: Bearer <token>`), y los marcados con 👤 requieren además rol `ADMIN`.

### Auth (`/api/auth`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro de un nuevo usuario |
| POST | `/auth/login` | Inicio de sesión, retorna JWT |
| GET | `/auth/me` 🔒 | Datos del usuario autenticado |

### Products (`/api/products`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/products` | Listar/buscar productos (filtros) |
| GET | `/products/:id` | Detalle de un producto |
| POST | `/products` 🔒👤 | Crear producto |
| PATCH | `/products/:id` 🔒👤 | Actualizar producto |

### Inventory (`/api/inventory`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/inventory/:productId` | Ver stock de un producto |
| GET | `/inventory/:productId/movements` | Historial de movimientos de stock |
| POST | `/inventory/:productId/purchase` | Registrar ingreso de stock (compra) |
| POST | `/inventory/:productId/adjust` | Ajuste manual de stock |

### Cart (`/api/cart`) — todos los endpoints 🔒
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/cart` | Obtener el carrito del usuario autenticado |
| POST | `/cart/items` | Agregar un producto al carrito |
| PATCH | `/cart/items/:productId` | Actualizar cantidad de un ítem |
| DELETE | `/cart/items/:productId` | Eliminar un ítem del carrito |
| DELETE | `/cart` | Vaciar el carrito |

### Addresses (`/api/addresses`) — todos los endpoints 🔒
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/addresses` | Crear dirección |
| GET | `/addresses` | Listar direcciones del usuario |
| GET | `/addresses/:id` | Detalle de una dirección |
| PATCH | `/addresses/:id` | Actualizar dirección |
| DELETE | `/addresses/:id` | Eliminar dirección |

### Orders (`/api/orders`) — todos los endpoints 🔒
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/orders` | Crear una orden a partir del carrito |
| GET | `/orders` | Listar órdenes del usuario autenticado |
| GET | `/orders/:id` | Detalle de una orden |

### Payments (`/api/payments`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/payments/:orderId/create` 🔒 | Crear transacción de pago en Transbank Webpay |
| GET | `/payments/return` | Retorno GET de Webpay tras el pago (confirma la transacción) |
| POST | `/payments/return` | Retorno POST de Webpay tras el pago (confirma la transacción) |

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run build` | Compila el proyecto con Nest CLI |
| `npm run start` | Inicia la aplicación |
| `npm run start:dev` | Inicia en modo watch |
| `npm run start:debug` | Inicia en modo debug + watch |
| `npm run start:prod` | Ejecuta el build compilado (`dist/main`) |
| `npm run lint` | Ejecuta ESLint con autofix |
| `npm run format` | Formatea el código con Prettier |

## Estructura del proyecto

```
.
├── prisma/
│   ├── schema.prisma        # Modelo de datos
│   ├── seed.ts               # Script de datos de ejemplo
│   └── migrations/           # Historial de migraciones
├── src/
│   ├── auth/                 # Registro, login, JWT, guards y decoradores
│   ├── users/                # Módulo de usuarios
│   ├── products/              # Catálogo de productos
│   ├── inventory/             # Stock y movimientos de inventario
│   ├── cart/                  # Carrito de compras
│   ├── addresses/             # Direcciones de despacho
│   ├── orders/                # Órdenes de compra
│   ├── payments/              # Integración con Transbank Webpay
│   ├── prisma/                # Servicio/módulo compartido de Prisma
│   ├── app.module.ts
│   └── main.ts                # Bootstrap de la aplicación (prefijo /api, Swagger, validación)
├── .env.example
└── package.json
```
