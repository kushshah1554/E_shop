# 🛍️ Monster E-commerce — Full-Stack Online Store

A complete **e-commerce web application** (fashion/apparel store) with a **customer storefront** and a **admin back-office**, built as a monorepo with two apps:

| App      | Path      | Stack                                             | Default port |
| -------- | --------- | ------------------------------------------------- | ------------ |
| Frontend | `/client` | React 19 + TypeScript + Vite + Tailwind CSS v4    | `5173`       |
| Backend  | `/server` | Node + Express 5 + TypeScript + MongoDB (Mongoose)| `5000`       |

> **One-line summary:** Customers browse/filter products, wishlist them, build a cart (guest or signed-in), apply promo codes, and check out with **Razorpay**, **eSewa**, or **loyalty points**; admins manage catalog, coupons, banners, orders and see sales stats.

This README is written so that **another AI (or developer) can understand the whole project from this file alone**.

---

## Table of contents

1. [Main features](#main-features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Repository structure](#repository-structure)
5. [Getting started (run it locally)](#getting-started-run-it-locally)
6. [Environment variables](#environment-variables)
7. [Authentication & authorization](#authentication--authorization)
8. [Payment flows](#payment-flows)
9. [Business rules](#business-rules)
10. [Data models (MongoDB)](#data-models-mongodb)
11. [API reference](#api-reference)
12. [Frontend architecture](#frontend-architecture)
13. [Coding conventions](#coding-conventions)
14. [Scripts / build / lint](#scripts--build--lint)
15. [Known gaps & notes for AI assistants](#known-gaps--notes-for-ai-assistants)

---

## Main features

### 👤 Customer (storefront) — routes under `/`

- **Home page** — hero banners (admin-managed, uploaded to Cloudinary), category list, 4 newest active products, 4 active promo/coupon cards. Served by one aggregated `GET /customer/home` endpoint.
- **Catalog & filtering** — product list with filters by `category`, `brand`, `color`, `size` and sorting (`recent`, `price-low`, `price-high`).
- **Product detail** — image gallery, color/size option selectors, sale price, stock, and **4 related products from the same category**.
- **Wishlist** — add/remove products; persisted in MongoDB per user.
- **Cart** — quantity increase/decrease/remove, per-variant lines (`color` + `size`), promo application, live totals.
  - **Guest cart** is stored in `localStorage` (`guest_cart_items`) and is **merged into the server cart on login** via `POST /customer/cart/sync`.
- **Addresses** — CRUD of saved delivery addresses on the user profile (one can be default).
- **Checkout** — choose an address, apply a promo code, pick a payment method:
  - **Razorpay** (cards / UPI / netbanking, currency `INR`)
  - **eSewa** (Nepali wallet, redirect-based flow)
  - **Pay with loyalty points** (1 point = 1 currency unit)
- **Orders** — order history with status timeline (`placed → shipped → delivered → returned`), payment status, and **self-service return within 7 days of delivery** (restocks products and credits points).
- **Auth** — sign-in / sign-up via **Clerk**; profile dialog shows name, email, role and points balance.

### 🛠️ Admin (back-office) — routes under `/admin`

- **Dashboard** — lightweight stats: total products, total categories, total orders, returned orders, and **total sales** (aggregation over paid orders).
- **Products** — full CRUD with **multi-image upload to Cloudinary** (max 10 images × 5 MB), cover-image selection, colors, sizes (`S/M/L/XL`), price, `salePercentage`, stock, active/inactive status, title search.
- **Categories** — create / rename.
- **Coupons (Promos)** — CRUD with `percentage` (1–100), `count` (usage limit), `minimumOrderValue`, `startsAt` / `endsAt` window; usage counter is decremented at payment time.
- **Orders** — list all orders, change status (`placed`, `shipped`, `delivered`, `returned`); marking `returned` restocks the products, marking `delivered` stamps `deliveredAt`.
- **Settings (Banners)** — list/upload homepage banners (Cloudinary folder `ecommerce-monster-video/banners`).

---

## Tech stack

### Frontend (`/client`)

| Concern            | Technology                                                                  |
| ------------------ | --------------------------------------------------------------------------- |
| UI library         | **React 19** (`react`, `react-dom` 19.x)                                     |
| Language           | **TypeScript** (~6.0)                                                        |
| Build tool         | **Vite 8** (`@vitejs/plugin-react`)                                          |
| Routing            | **react-router-dom 7** (`createBrowserRouter`, nested layouts)               |
| State management   | **Zustand 5** (one store per feature)                                        |
| HTTP               | **Axios** (interceptor injects `Authorization: Bearer <Clerk token>`)        |
| Styling            | **Tailwind CSS v4** (`@tailwindcss/vite`), `tw-animate-css`, Inter font      |
| Component library  | **shadcn/ui-style components** built on **Radix UI** (`radix-ui` package), CVA, `cn`/`clsx`/`tailwind-merge` |
| Drawer             | **vaul** (cart & checkout side drawer)                                       |
| Toasts             | **sonner**                                                                   |
| Auth               | **@clerk/react** (`ClerkProvider`, `useAuth`)                                |
| Theme              | **next-themes** (used by the sonner toaster)                                 |
| Icons              | **lucide-react**                                                             |
| Payments (browser) | Razorpay Checkout JS (loaded via `<script>`, typed in `src/types/razorpay.d.ts`) |
| Linting            | **oxlint**                                                                   |

### Backend (`/server`)

| Concern            | Technology                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| Runtime / language | Node.js + **TypeScript** (CommonJS, compiled with `tsc`, run with `tsx`)   |
| Framework          | **Express 5**                                                             |
| Database           | **MongoDB** via **Mongoose 9**                                             |
| Auth               | **@clerk/express** (`clerkMiddleware`, `getAuth`) + custom role guards     |
| File uploads       | **multer** (memory storage) → **Cloudinary** (`streamifier` upload stream) |
| Payments           | **razorpay** SDK (server-side orders + HMAC signature verification)        |
| HTTP logs          | **morgan**                                                                 |
| CORS               | **cors** (origin allow-list from `CORS_ORIGINS`)                           |
| Config             | **dotenv** (`import "dotenv/config"`)                                      |
| Validation         | Manual validation helpers (`requireText`, `requireNumber`, `requireFound`) — `zod` is installed but **not used yet** |

### Third-party services

- **Clerk** — authentication (email/social), session tokens, user sync into our `User` collection.
- **Cloudinary** — image hosting for product images and banners.
- **Razorpay** — online payments (INR).
- **eSewa** — Nepali wallet payments via signed HTML form redirect + status verification API.
- **MongoDB Atlas** (or any MongoDB) — persistence.

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  client/  React SPA (Vite)  │         │  server/  Express 5 API      │
│                             │  HTTP   │                              │
│  ClerkProvider              │ ──────► │  clerkMiddleware()           │
│  react-router (nested       │  JSON   │  cors / morgan / express.json│
│    layouts + role guards)   │  Bearer │                              │
│  Zustand stores (per feature│  token  │  /auth   /customer  /admin   │
│    auth, cart, wishlist…)   │         │                              │
│  axios wrapper (lib/api.ts) │ ◄────── │  envelope { status, data,    │
│  shadcn/Radix UI + Tailwind │         │           errors[] }         │
└─────────────────────────────┘         └───────┬──────────┬───────────┘
                                                │          │
                                     Mongoose   │          │  HTTPS
                                                ▼          ▼
                                          ┌──────────┐  ┌─────────────────┐
                                          │ MongoDB  │  │ Cloudinary      │
                                          └──────────┘  │ Razorpay        │
                                                        │ eSewa           │
                                                        │ Clerk Backend   │
                                                        └─────────────────┘
```

**Request pipeline (server):**

1. `cors` (allow-list) → `express.json` → `morgan` → `clerkMiddleware()`.
2. Router-level guards: `requireAuth` (any signed-in user) or `requireAdmin` (role check).
3. Handler wrapped in `asyncHandler` (catches async errors → `errorHandler`).
4. Thrown `AppError(statusCode, message)` → JSON `{ status:"error", errors:[{message, code}] }`.
5. Success → JSON `{ status:"success", data }` via the `ok()` helper.
6. `notFound` → `errorHandler` are registered last.

---

## Repository structure

```
.
├── README.md                  ← this file
├── client/                    ← React SPA
│   ├── index.html
│   ├── package.json           ← scripts: dev / build / lint / preview
│   ├── vite.config.ts         ← @ alias → ./src, tailwindcss + react plugins
│   ├── components.json        ← shadcn config
│   └── src/
│       ├── main.tsx           ← ClerkProvider + Toaster
│       ├── App.tsx            ← useBootstrapAuth() + RouterProvider
│       ├── router.tsx         ← all routes & layouts
│       ├── lib/
│       │   ├── api.ts         ← axios instance + apiGet/apiPost/apiPut/apiPatch/apiDelete
│       │   ├── env.ts         ← VITE_BACKEND_URL
│       │   ├── types.ts       ← ApiEnvelope, AppUser, UserRole
│       │   └── utils.ts       ← cn()
│       ├── features/          ← feature slices: api.ts + store.ts + types.ts (+ hooks)
│       │   ├── auth/          ← useBootstrapAuth, syncUser, getMe
│       │   ├── admin/{dashboard,orders,products,promo,settings}/
│       │   └── customer/{home,products,wishlist,profile,orders,cart-and-checkout}/
│       ├── pages/
│       │   ├── auth/          ← Sign-in, Sign-up
│       │   ├── customer/      ← Home, Collections, Collection-Details,
│       │   │                     Order-Sucess, Esewa-Success, Esewa-Failure
│       │   └── admin/         ← Dashboard, Products, Promos, Orders, Settings
│       ├── components/
│       │   ├── ui/            ← shadcn/Radix primitives (button, dialog, drawer…)
│       │   ├── layout/        ← CustomerLayout, AdminLayout
│       │   ├── auth/          ← ProtectedLayout, PublicOnlyLayout, RoleGuardLayout
│       │   ├── common/        ← Loader
│       │   ├── customer/      ← navbar, product cards, filters, cart drawer,
│       │   │                     wishlist/profile/orders dialogs, details gallery
│       │   └── admin/         ← sidebar, products table + dialogs, promos, banners
│       └── types/razorpay.d.ts
│
└── server/                    ← Express API
    ├── package.json           ← scripts: dev / build / start
    ├── tsconfig.json
    └── src/
        ├── server.ts          ← app bootstrap, CORS, middleware, route mounting
        ├── db.ts              ← mongoose.connect(MONGO_URI)
        ├── middleware/        ← auth (requireAuth, requireAdmin, getDbUserFromReq),
        │                        errorHandler, notFound
        ├── models/            ← User, Product, Category, Cart, Wishlist,
        │                        Order, Promo, Banner
        ├── routes/
        │   ├── auth/          ← auth.routes.ts
        │   ├── customer/      ← product, address, promo, cart-wishlist, checkout,
        │   │                     checkout-with-points, orders, home
        │   └── admin/         ← product, promo, orders, settings, dashboard
        └── utils/             ← AppError, asyncHandler, envelope (ok/fail),
                                  helpers (requireText/requireNumber/requireFound),
                                  cloudinary, razorpay
```

> There is **no root `package.json`** — the two apps are installed and started independently.

---

## Getting started (run it locally)

### Prerequisites

- Node.js 20+ and npm
- A MongoDB connection string (e.g. MongoDB Atlas)
- Clerk account (publishable + secret keys)
- *(Optional)* Cloudinary, Razorpay, eSewa credentials

### 1. Backend

```bash
cd server
npm install
# create .env (see Environment variables below)
npm run dev        # tsx watch src/server.ts  →  http://localhost:5000
```

Smoke test: `GET http://localhost:5000/health` → `{ "status": "success", "data": { "message": "server is healthy" } }`

### 2. Frontend

```bash
cd client
npm install
# create .env
npm run dev        # vite  →  http://localhost:5173
```

### 3. Admin access

Admin role is derived from the `ADMIN_EMAILS` env var on the server: when a user signs up / syncs with an email listed there (comma-separated, case-insensitive), their DB role becomes `admin`. Otherwise the role is `user`. Admin UI routes are additionally protected by `RoleGuardLayout allow={["admin"]}`.

---

## Environment variables

### `server/.env`

| Key                    | Purpose                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `PORT`                 | API port (default `5000`)                                                 |
| `MONGO_URI`            | MongoDB connection string                                                 |
| `CORS_ORIGINS`         | Comma-separated allow-list, e.g. `http://localhost:5173`                  |
| `CLERK_PUBLISHABLE_KEY`| Clerk publishable key                                                     |
| `CLERK_SECRET_KEY`     | Clerk secret key (used by `clerkMiddleware` / `clerkClient`)              |
| `ADMIN_EMAILS`         | Comma-separated emails that get the `admin` role                          |
| `CLOUDINARY_CLOUD_NAME`<br>`CLOUDINARY_API_KEY`<br>`CLOUDINARY_API_SECRET` | Image uploads          |
| `RAZORPAY_KEY_ID`<br>`RAZORPAY_KEY_SECRET`                                | Razorpay orders + signature verification            |
| `ESEWA_PRODUCT_CODE`<br>`ESEWA_SECRET_KEY`                                | eSewa merchant credentials (HMAC-SHA256 signing)     |
| `ESEWA_FORM_URL`       | eSewa payment form endpoint (defaults to the `rc-` sandbox)               |
| `ESEWA_SUCCESS_URL`<br>`ESEWA_FAILURE_URL`                                | Browser redirect targets → `/esewa-success`, `/failure` |
| `ESEWA_STATUS_URL` *(optional)* | Overrides the transaction status verification endpoint           |

### `client/.env`

| Key                        | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `VITE_BACKEND_URL`         | API base URL, default `http://localhost:5000`  |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for `ClerkProvider`    |

---

## Authentication & authorization

1. Users sign up / sign in through **Clerk** (`/sign-in/*`, `/sign-up/*`).
2. On boot, `useBootstrapAuth()`:
   - registers an axios token getter (`getToken()` from Clerk → `Authorization: Bearer …`),
   - calls `POST /auth/sync` (upserts the Mongo `User` keyed by `clerkUserId`, assigns role from `ADMIN_EMAILS`),
   - then `GET /auth/me` to populate the Zustand auth store.
3. Server side:
   - `clerkMiddleware()` parses the token for every request.
   - `requireAuth` → 401 if no `userId`.
   - `getDbUserFromReq()` → loads the Mongo user (404 if missing).
   - `requireAdmin` → 403 unless `user.role === "admin"`.
   - Routers apply `router.use(requireAuth)` or `router.use(requireAdmin)` globally.
4. Client side route guards:
   - `PublicOnlyLayout` — redirects signed-in users away from sign-in/sign-up.
   - `ProtectedLayout` — redirects anonymous users to `/sign-in`.
   - `RoleGuardLayout allow={[...]}` — redirects wrong-role users to `/`.

---

## Payment flows

### A. Razorpay

```
Client                                Server                         Razorpay
  │ POST /customer/checkout/create-session  │                            │
  │  {addressId, promoCode, paymentMethod:"razorpay"}
  │ ───────────────────────────────────────►│ create order (amount in paise)
  │ ◄── {paymentSession:{keyId,orderId,amount,currency}, order:{_id,…}}
  │ new window.Razorpay({order_id,…}).open()│                            │
  │ ────────────────────────────────────────────────────────────────────►│
  │ handler ─► POST /customer/checkout/confirm
  │            {orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature}
  │            │ verify HMAC-SHA256(order_id|payment_id, KEY_SECRET)     │
  │            │ settlePaidOrder(): stock--, promo count--, clear cart,  │
  │            │                     paymentStatus="paid"                │
  │ ◄── {_id}  │                                                          │
```

### B. eSewa (redirect flow)

```
POST /customer/checkout/create-session {paymentMethod:"esewa"}
  → server builds signed fields (HMAC-SHA256 of
    total_amount,transaction_uuid,product_code with ESEWA_SECRET_KEY),
    creates a pending Order with esewaTransactionUuid = randomUUID()
  → client builds a hidden <form> and POSTs it to ESEWA_FORM_URL
  → the transaction_uuid is remembered in sessionStorage
     (key: esewa_pending_transaction_uuid)
  → eSewa redirects to:
       • ESEWA_SUCCESS_URL → /esewa-success page →
           POST /customer/checkout/esewa/verify
           – server calls eSewa status API (product_code, total_amount,
             transaction_uuid), requires status=COMPLETE and amount match,
             then settlePaidOrder()
       • ESEWA_FAILURE_URL → /failure page →
           POST /customer/checkout/esewa/failure
           – marks the pending order failed (recoverable: a later
             verify call still confirms it if the payment actually went
             through)
```

### C. Pay with loyalty points

```
GET  /customer/checkout/points              → { points }
POST /customer/checkout/pay-with-points     → {addressId, promoCode}
  • recompute subtotal + promo discount server-side
  • if totalAmount > points → 400 "Not enough points"
  • atomic decrement: User.updateOne({_id, points: {$gte: total}}, {$inc:{points:-total}})
  • reserve stock per item, burn promo count, clear cart
  • create Order with paymentStatus "paid",
    razorpayOrderId/paymentId = "points_<timestamp>"
  • on any failure → points are refunded ($inc back) and the error rethrown
```

**Where points come from:** a customer return (`PATCH /customer/orders/:id/return`, within 7 days of `deliveredAt`) credits `points += order.totalAmount`. Points are otherwise only spent at checkout.

---

## Business rules

- **Final price:** `finalPrice = salePercentage ? round(price - price*salePercentage/100) : price`. Recomputed **on the server** at cart read, checkout and home feed — never trusted from the client.
- **Stock:** validated before creating a session, and decremented with a guarded update `{stock: {$gte: qty}}` at payment settlement; if any line fails → `400 One or more cart items are out of stock`.
- **Only `status: "active"` products** are visible/checkout-able to customers.
- **Promo codes:** must exist, be within `[startsAt, endsAt]`, have `count >= 1`, and `orderValue >= minimumOrderValue`. Discount = `round(subtotal * percentage / 100)`; total is clamped to `>= 0`. Usage (`count`) is decremented once, at successful settlement.
- **Variant validation:** if a product defines colors, a valid color is required; same for sizes (`S|M|L|XL`).
- **Order lifecycle:** `placed → shipped → delivered → returned`; payment `pending | paid | failed`.
- **Returns:** only `delivered` orders, only within **7 days** of `deliveredAt`; restock + credit points.
- **Admin returning an order** restocks inventory (see [Known gaps](#known-gaps--notes-for-ai-assistants)).
- **Guest cart:** lives in `localStorage`; merged server-side on first signed-in cart load, then cleared locally.

---

## Data models (MongoDB)

| Model      | Key fields                                                                                     | Notes |
| ---------- | ---------------------------------------------------------------------------------------------- | ----- |
| `User`     | `clerkUserId` (unique), `name`, `email`, `role: user\|admin`, `points`, `addresses[]` (`fullName, address, state, postalCode, isDefault`) | Upserted by `/auth/sync` |
| `Category` | `name`                                                                                         | |
| `Product`  | `title`, `description`, `category`(ref), `brand`, `stock`, `images[]{url, publicId, isCover}`, `colors[]`, `sizes[]`, `price`, `salePercentage`, `status`, `createdBy`(ref) | `timestamps` |
| `Cart`     | `user`(ref), `items[]{product, quantity, color?, size?}`                                        | One cart per user |
| `Wishlist` | `user`(ref), `products[](ref)`                                                                  | |
| `Order`    | `user`, `customerName/Email`, `items[]{product, quantity}`, `totalItems`, `deliveryName/Address`, `promoCode`, `discountAmount`, `totalAmount`, `paymentStatus`, `orderStatus`, `paymentMethod: razorpay\|esewa`, `razorpayOrderId`, `paymentId`, `esewaTransactionUuid/Code`, `paidAt/deliveredAt/returnedAt` | Indexes on `(user,createdAt)`, `(orderStatus,createdAt)`, `(paymentStatus,createdAt)` |
| `Promo`    | `code`(unique, uppercase), `percentage`(1–100), `count`, `minimumOrderValue`, `startsAt`, `endsAt` | |
| `Banner`   | `imageUrl`, `imagePublicId`, `createdBy`                                                        | Homepage carousel |

---

## API reference

Base URL: `http://localhost:5000`. Every response uses the envelope:

```jsonc
// success
{ "status": "success", "data": { … } }
// error
{ "status": "error", "data": null, "errors": [ { "message": "…", "code": "API_ERROR" } ] }
```

### Health

| Method | Path      | Auth | Description |
| ------ | --------- | ---- | ----------- |
| GET    | `/health` | —    | Liveness check |

### `/auth`

| Method | Path          | Auth | Description |
| ------ | ------------- | ---- | ----------- |
| POST   | `/auth/sync`  | ✅   | Upsert Mongo user from Clerk profile; assign admin role from `ADMIN_EMAILS` |
| GET    | `/auth/me`    | ✅   | Current DB user (`id, clerkUserId, email, name, role`) |

### `/customer` (all require auth unless marked)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/customer/categories` | All categories |
| GET    | `/customer/products` | Products (`?category&brand&color&size&sort=recent\|price-low\|price-high`), active only |
| GET    | `/customer/products/:id` | Product + 4 related products |
| GET    | `/customer/home` | Aggregated home: banners, categories, 4 newest products, 4 active coupons *(public)* |
| GET    | `/customer/addresses` | List addresses |
| POST   | `/customer/addresses` | Create address |
| PATCH  | `/customer/addresses/:addressId` | Update address |
| DELETE | `/customer/addresses/:addressId` | Delete address |
| POST   | `/customer/promos/apply` | Validate promo against `orderValue` |
| GET    | `/customer/cart` | Cart with populated product previews |
| POST   | `/customer/cart/items` | Add item (`productId, quantity, color?, size?`) |
| PATCH  | `/customer/cart/items/:productId/increase` | +1 for that variant |
| PATCH  | `/customer/cart/items/:productId/decrease` | −1 (line is removed at 0) |
| DELETE | `/customer/cart/items/:productId` | Remove that variant line |

> Cart lines are addressed by `:productId` **plus optional `?color=&size=` query params** (a product can appear multiple times with different variants).
| POST   | `/customer/cart/sync` | Merge guest cart items into server cart |
| GET    | `/customer/wishlist` | Wishlist |
| POST   | `/customer/wishlist/items` | Add to wishlist |
| DELETE | `/customer/wishlist/items/:productId` | Remove from wishlist |
| POST   | `/customer/checkout/create-session` | Build order + Razorpay order **or** signed eSewa form |
| POST   | `/customer/checkout/confirm` | Verify Razorpay signature → settle order |
| POST   | `/customer/checkout/esewa/verify` | Verify against eSewa status API → settle order |
| POST   | `/customer/checkout/esewa/failure` | Mark pending eSewa order failed |
| GET    | `/customer/checkout/points` | Current points balance |
| POST   | `/customer/checkout/pay-with-points` | Place order paid entirely with points |
| GET    | `/customer/orders` | Own order history |
| PATCH  | `/customer/orders/:orderId/return` | Return a delivered order (7-day window) |

### `/admin` (all require `role === "admin"`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/admin/dashboard/lite` | `{totalProducts, totalCategories, totalSales, totalOrders, totalReturnedOrders}` |
| GET    | `/admin/categories` | List categories |
| POST   | `/admin/categories` | Create category |
| PUT    | `/admin/categories/:id` | Rename category |
| GET    | `/admin/products` | List products (`?search=` regex on title) |
| GET    | `/admin/products/:id` | Single product |
| POST   | `/admin/products` | Create product (`multipart/form-data`, field `images`, ≤10 files) |
| PUT    | `/admin/products/:id` | Update product (`multipart`, `existingImages` JSON + `coverImagePublicId`) |
| GET    | `/admin/promos` | List coupons |
| POST   | `/admin/promos` | Create coupon |
| PATCH  | `/admin/promos/:promoId` | Update coupon |
| DELETE | `/admin/promos/:promoId` | Delete coupon |
| GET    | `/admin/orders` | All orders |
| PATCH  | `/admin/orders/:orderId/status` | Set `placed\|shipped\|delivered\|returned` |
| GET    | `/admin/settings/banners` | List banners |
| POST   | `/admin/settings/banners` | Upload banners (`multipart`, field `images`) |

---

## Frontend architecture

### Routing (`src/router.tsx`)

```
/                       → CustomerLayout
├─ /                    → StoreHome (public)
├─ (PublicOnlyLayout)
│   ├─ /sign-in/*       → SignInPage
│   ├─ /sign-up/*       → SignUpPage
│   ├─ /collections     → Collections (list + filters)
│   └─ /collection/:id  → CollectionDetails (product detail)
├─ (ProtectedLayout)
│   ├─ /order-success   → CustomerOrderSuccessPage
│   ├─ /esewa-success   → CustomerEsewaSuccessPage  ← ESEWA_SUCCESS_URL
│   └─ /failure         → CustomerEsewaFailurePage   ← ESEWA_FAILURE_URL
└─ (ProtectedLayout → RoleGuardLayout allow=["admin"]) → AdminLayout
    ├─ /admin           → Dashboard
    ├─ /admin/products  → Products
    ├─ /admin/coupons   → Promos
    ├─ /admin/orders    → Orders
    └─ /admin/settings  → Settings (banners)
```

### Feature-slice pattern

Each feature owns three files (sometimes plus a hook):

- `types.ts` — request/response TS types
- `api.ts` — thin functions over `apiGet/apiPost/…` (`@/lib/api`)
- `store.ts` (or `use-*.ts`) — Zustand store / React hook that composes the api functions and toast feedback

Examples: `features/customer/cart-and-checkout/store.ts` (cart, promo, Razorpay/eSewa/points checkout, guest cart persistence), `features/auth/useBootstrapAuth.ts`, `features/admin/products/use-admin-products.ts`.

### Shared UI

`components/ui/*` are shadcn-style primitives over Radix (`dialog`, `dropdown-menu`, `select`, `sheet`, `table`, `drawer` via vaul, etc.), styled with Tailwind v4 utility classes and `cn()` (`clsx` + `tailwind-merge` + CVA). The path alias `@/* → src/*` is configured in `vite.config.ts` and the tsconfigs.

---

## Coding conventions

- **Server**
  - Every handler is wrapped in `asyncHandler(...)`; throw `new AppError(status, message)` — never `res.status(...)` for errors.
  - Responses use `ok(data)` / `fail(message, code)` from `utils/envelope.ts`.
  - Guard helpers: `requireText`, `requireNumber`, `requireFound`.
  - Routers call `router.use(requireAuth | requireAdmin)` instead of per-route middleware.
  - Mongoose models are written as `mongoose.models.X || mongoose.model(...)` to survive hot reload.
  - Handlers read money/stock/promo logic on the server; the client is never trusted.
- **Client**
  - Never call `axios` directly — use `lib/api.ts` helpers so the envelope and Bearer token are handled.
  - Keep API functions in `features/<area>/api.ts`, state in `store.ts`, types in `types.ts`.
  - Feedback via `toast` from `sonner`.
  - Money computed as integers where possible (`Math.round`), display via the shared helpers.

---

## Scripts / build / lint

```bash
# client
cd client
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview   # preview production build

# server
cd server
npm run dev       # tsx watch src/server.ts
npm run build     # tsc  → dist/
npm start         # node dist/server.js
```

> There is currently **no automated test suite** in either app.

---

## Known gaps & notes for AI assistants

Keep these in mind before changing anything:

1. **No tests / no CI.** Verify changes with `npm run build` (client) and `npx tsc --noEmit` / `npm run build` (server), plus a manual smoke test of the touched flow.
2. **Zod is a dependency but unused** — validation is hand-rolled via `helpers.ts`.
3. **Points accrual:** only customer-initiated returns credit points. The comment in `admin/orders.routes.ts` ("add the points to that user points") indicates admin-driven returns were *intended* to credit points too, but currently only restock inventory.
4. **Banner admin API is create/list only** — there is no `DELETE /admin/settings/banners` endpoint yet (and no delete UI action wired to one).
5. **eSewa sandbox vs production** is selected by env (`ESEWA_FORM_URL` containing `rc-` → sandbox status URL); defaults point at the sandbox.
6. **Razorpay currency is hardcoded `INR`** in `checkout.routes.ts`; eSewa amounts are NPR-shaped decimals — the app mixes two markets intentionally.
7. **Typos exist in user-facing strings** (`successfull`, `avaibale`, `threesold`, `excedded`, `Order places`, file `Order-Sucess.tsx`) — preserve behavior if refactoring, but feel free to fix copy.
8. **`console.log` debugging left in** `PUT /admin/products/:id` (`console.log("BODY: ", req.body)`).
9. **Guest cart key:** `guest_cart_items` in `localStorage`; eSewa pending key: `esewa_pending_transaction_uuid` in `sessionStorage`.
10. **Admin role is env-driven**, not a DB UI — to make someone an admin, add their email to `ADMIN_EMAILS` and have them re-sync (re-login).
11. **Ports:** API `5000` (server), Vite `5173` (client). `CORS_ORIGINS` must include the client origin.
12. Response envelope shape is fixed — the client's `apiGet/apiPost/...` **throws** if `status !== "success"` or `data` is null.
