# Crave House

Crave House is a full-stack restaurant ordering and table-reservation application. Customers can browse the MongoDB-backed menu, maintain a local cart, place delivery, pickup, or dine-in orders, pay by cash on delivery or Razorpay, and submit table reservations. Admin and restaurant-owner dashboards provide role-restricted order, menu, reservation, customer, payment, and sales views.

The frontend is a React single-page application built with Vite. It communicates with a Node.js/Express REST API, which uses Mongoose to store application data in MongoDB.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture and Data Flow](#architecture-and-data-flow)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Configuration](#installation-and-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Frontend Routes](#frontend-routes)
- [Backend API](#backend-api)
- [Authentication and Authorization](#authentication-and-authorization)
- [Database Models](#database-models)
- [Seed Data](#seed-data)
- [NPM Scripts](#npm-scripts)
- [Testing and Manual API Checks](#testing-and-manual-api-checks)
- [Troubleshooting](#troubleshooting)
- [Security Notes and Limitations](#security-notes-and-limitations)
- [Future Improvements](#future-improvements)
- [License](#license)

## Features

### Customer

- Browse active categories and available menu items. Menu lists support searching, sorting, price/rating filters, and pagination.
- Open item details, including description, ingredients, nutrition information, rating, and review count where provided by the menu data.
- Add items to a cart, change quantities, or remove items. The cart is saved in browser `localStorage`.
- Place delivery, pickup, or dine-in orders. The backend reloads the selected menu items and calculates the order subtotal from current database prices; tax, delivery fee, and discount are currently zero.
- Pay by cash on delivery or through Razorpay Checkout. Online payment orders are created by the backend and payment signatures are verified server-side.
- View saved orders and individual order details.
- Create table reservations and view reservation history.
- Register and sign in as a customer, edit profile details, and change a password from the customer account page.

### Admin

- View dashboard KPIs, recent orders and reservations, revenue trends, category breakdowns, and top-selling items.
- Browse and update all orders, including order status and payment status.
- Review Razorpay payment records.
- Create, edit, mark available/unavailable, and delete menu items.
- Review customer accounts, update user details/roles/status, and view individual customer records.
- View and update reservation statuses.
- Use category management endpoints to create, edit, activate/deactivate, and delete categories. Category management is available through the API; the current dashboard does not provide a category-management page.

### Restaurant Owner

- View operational KPIs, recent orders, sales trends, and category breakdowns.
- Browse orders and move them through the implemented order-status lifecycle.
- Create and edit menu items or change availability. Menu-item deletion is admin-only.
- Manage reservation statuses.
- View the Tables page. Its table list and occupancy statuses are static mock data, not live table-management records.

### Staff

There is no separate `staff` role in the application. The `/staff-login` page is an alternate login screen for the `admin` and `owner` roles and routes them to their respective dashboards.

### Current behavior and limitations

- Reservation booking is saved in MongoDB, but the “check availability” interaction is a frontend simulation using fixed time-slot rules; it does not query real table inventory.
- The reservation success message mentions a confirmation, but the backend does not send email or other notifications. A reservation starts in `Pending`, and its table field defaults to `T-TBD`.
- Customers cannot cancel a reservation through the current API/UI. The customer-page cancellation action only asks the customer to contact the restaurant; an admin or owner can update its status.
- Razorpay online payments depend on valid Razorpay credentials and the Razorpay Checkout script loaded from Razorpay’s hosted URL. There is no payment webhook or automatic refund workflow.
- A failed/cancelled online payment can leave its already-created order in the database with an unpaid status; retry and cleanup are not automated.
- Menu ratings and review counts are stored as menu-item fields, but there is no customer review-submission API or page.
- Admin and owner analytics normally come from the API, but their overview components have hard-coded reservation-count fallback values that remain visible if the analytics request fails.
- Some landing-page content and the owner table board are static. Order, menu, reservation, user, payment, and analytics APIs use MongoDB.

## Technology Stack

| Area | Technology | Purpose |
|---|---|---|
| Frontend | React | UI and reusable components |
| Frontend | Vite | Development server and production build |
| Frontend | React Router DOM | Client-side routes and dashboard subroutes |
| Frontend | Framer Motion | UI animation |
| Frontend | React Icons | Interface icons |
| Backend | Node.js | JavaScript runtime |
| Backend | Express | REST API and middleware |
| Backend | Mongoose | MongoDB schemas, validation, and database access |
| Backend | `jsonwebtoken` | Signing and verifying authentication JWTs |
| Backend | `bcryptjs` | Password hashing and comparison |
| Backend | Razorpay SDK | Creating provider-side payment orders |
| Backend | `cors` | Cross-origin request handling |
| Backend | `dotenv` | Loading backend environment configuration |
| Backend development | `nodemon` | Restarting the API on source changes |
| Database | MongoDB | Persistent users, menu, orders, payments, and reservations |

The frontend manifest uses `latest` for React, React DOM, Vite, and the Vite React plugin; other dependency ranges are declared in the respective `package.json` files. Both the project root and `server/` have `package-lock.json` files to keep their dependency installs reproducible.

## Architecture and Data Flow

```text
Browser (React + Vite)
  ├─ React Router pages and dashboard views
  ├─ AuthContext / CartContext
  ├─ localStorage: JWT, cached user, cart, last-order confirmation
  └─ src/services/* ── HTTP + JSON ──> Express API (/api)
                                          ├─ JWT and role middleware
                                          ├─ controllers and Mongoose models
                                          └─ MongoDB (example URI database: crave_house)

Online checkout ──> Express payment endpoints ──> Razorpay API
       ^                                      <── payment signature check
       └── Razorpay Checkout JS hosted by Razorpay
```

- The frontend API base URL is `VITE_API_URL`, defaulting to `http://localhost:5000/api`.
- The backend loads `server/.env`, connects to MongoDB before listening, and mounts the route modules under `/api`.
- Authenticated frontend services send the JWT as `Authorization: Bearer <token>`.
- The order endpoint uses database menu prices rather than trusting client-submitted item prices. It stores item snapshots so historical order lines retain their original names, images, prices, quantities, and subtotals.
- The payment flow first saves an application order, then requests a Razorpay order from the backend. The backend verifies Razorpay’s HMAC signature before marking the payment and associated order as paid.

## Project Structure

```text
Crave-House-main/
├── .env.example                 # Frontend VITE_API_URL template
├── .gitignore
├── index.html                   # Vite document entry
├── package.json                 # Frontend scripts and dependencies
├── package-lock.json
├── src/
│   ├── App.jsx                  # Browser routes and context providers
│   ├── main.jsx                 # React entry point
│   ├── style.css                # Global styling
│   ├── explore.css              # Menu/explore styling
│   ├── pizza-page.css           # Shared page and dashboard styling
│   ├── assets/                  # Logos and local food images
│   ├── components/              # Navigation, menu, home, and shared UI
│   │   └── dashboard/           # Shared dashboard layout and widgets
│   ├── context/                 # AuthContext and CartContext
│   ├── data/                    # Static category/menu content and mock tables
│   ├── pages/                   # Customer pages and Admin/Owner dashboards
│   └── services/
│       ├── analyticsService.js
│       ├── menuService.js
│       ├── orderService.js
│       ├── paymentService.js    # Razorpay order creation/verification
│       ├── reservationService.js
│       └── userService.js
└── server/
    ├── .env.example             # Backend, MongoDB, JWT, and Razorpay template
    ├── package.json             # Backend scripts and dependencies
    ├── package-lock.json
    └── src/
        ├── server.js            # Express setup, CORS, health route, startup
        ├── config/
        │   ├── db.js            # MongoDB connection
        │   └── razorpay.js      # Razorpay client configuration
        ├── controllers/
        │   ├── authController.js
        │   ├── categoryController.js
        │   ├── menuController.js
        │   ├── orderController.js
        │   ├── paymentController.js
        │   ├── reservationController.js
        │   ├── userController.js
        │   └── analyticsController.js
        ├── middleware/          # JWT authentication and role authorization
        ├── models/
        │   ├── User.js
        │   ├── Category.js
        │   ├── MenuItem.js
        │   ├── Order.js
        │   ├── Payment.js
        │   └── Reservation.js
        ├── routes/              # Includes paymentRoutes.js
        └── utils/               # JWT helpers, seed scripts, manual API scripts
```

## Prerequisites

- Node.js **20.19+** or **22.12+** (the currently locked Vite version requires this range).
- npm.
- MongoDB local service or MongoDB Atlas database.
- Razorpay account/API credentials to exercise online checkout. Cash on delivery does not require Razorpay credentials.

## Installation and Configuration

Run commands from the project root unless a command says otherwise.

### 1. Install dependencies

```powershell
npm install
Set-Location .\server
npm install
Set-Location ..
```

### 2. Configure the frontend

Create the root `.env` from the template:

```powershell
Copy-Item .env.example .env
```

The frontend template contains:

```env
VITE_API_URL=http://localhost:5000/api
```

Change the URL if the backend uses a different host or port. Restart Vite after changing frontend environment variables.

### 3. Configure the backend

Create `server/.env`:

```powershell
Copy-Item .\server\.env.example .\server\.env
```

Set private values in `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/crave_house
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

`PORT`, `MONGODB_URI`, and `JWT_SECRET` must be configured for normal backend operation. Razorpay credentials are needed only for online payments. Do not use the placeholder values from `.env.example` as real credentials.

### Environment variables

| Variable | File | Purpose |
|---|---|---|
| `VITE_API_URL` | Root `.env` | Frontend API base URL |
| `PORT` | `server/.env` | Express listening port; defaults to `5000` |
| `MONGODB_URI` | `server/.env` | MongoDB connection string; the example targets `crave_house` |
| `CLIENT_URL` | `server/.env` | Additional frontend origin allowed by CORS |
| `JWT_SECRET` | `server/.env` | Secret used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | `server/.env` | Token lifetime; defaults to `7d` |
| `RAZORPAY_KEY_ID` | `server/.env` | Razorpay public key ID returned to Checkout |
| `RAZORPAY_KEY_SECRET` | `server/.env` | Private key used to initialize Razorpay and verify payment signatures |

The backend also allows the Vite development/preview origins `http://localhost:5173` and `http://localhost:4173`, plus localhost and `127.0.0.1` origins on other ports.

## Database Setup

The server connects to MongoDB using Mongoose and `MONGODB_URI`. Mongoose creates collections as documents are written; no separate schema migration is required.

For a local MongoDB installation, start the MongoDB service before starting the API. For MongoDB Atlas, set `MONGODB_URI` in `server/.env` to the cluster connection string and keep its credentials private.

The server exposes a health check at `GET http://localhost:5000/api/health`. It responds with HTTP 200 when MongoDB is connected and HTTP 503 when the API is up but the database connection is not ready.

## Running the Application

Use two terminals. Start MongoDB first.

**Terminal 1 — backend**

```powershell
Set-Location .\server
npm run dev
```

The API connects to MongoDB before listening, and normally runs at `http://localhost:5000`.

**Terminal 2 — frontend**

```powershell
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. Open the URL printed by Vite if the default port is occupied.

## Frontend Routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/order` | Browse menu categories | Public |
| `/menu/pizza`, `/menu/burger`, `/menu/pasta`, `/menu/salad`, `/menu/drinks`, `/menu/desserts` | Browse a category | Public |
| `/menu/<category>/:id` | View a menu item | Public |
| `/cart` | Review cart | Public |
| `/checkout` | Submit an order | Signed-in customer required by the page/API |
| `/order-success` | Checkout confirmation | Public route; uses local last-order data |
| `/orders`, `/my-orders/:id` | View customer order history/details | Backend requires the owning customer |
| `/book-table` | Submit a reservation | Signed-in customer required to submit |
| `/reservations` | View customer reservations | Backend requires the owning customer |
| `/login`, `/register` | Customer authentication | Public |
| `/staff-login` | Admin/owner login | Public |
| `/account` | Customer profile and password settings | Customer role |
| `/admin/*` | Admin dashboard | Admin role |
| `/owner/*` | Restaurant-owner dashboard | Owner role |

Dashboard subroutes include:

- Admin: `/admin`, `/admin/orders`, `/admin/payments`, `/admin/reservations`, `/admin/menu`, `/admin/customers`, and `/admin/analytics`.
- Owner: `/owner`, `/owner/orders`, `/owner/menu`, `/owner/tables`, `/owner/reservations`, and `/owner/sales`.

## Backend API

All API paths below are relative to `http://localhost:5000`. Unless marked public, include `Authorization: Bearer <JWT>`. The server returns JSON. Route-level access is enforced by Express middleware; dashboard visibility alone is not authorization.

### Health and authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | API and MongoDB connection status |
| `POST` | `/api/auth/register` | Public | Register a customer (`name`, `email`, `password`; `phone` optional to the API) |
| `POST` | `/api/auth/login` | Public | Authenticate and return a JWT and user object |
| `GET` | `/api/auth/profile` | Any authenticated role | Get the current user's profile |
| `GET` | `/api/auth/admin-test` | Admin | Admin-role test endpoint |
| `GET` | `/api/auth/owner-test` | Owner | Owner-role test endpoint |

### Categories

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Public | List active categories |
| `GET` | `/api/categories/:slug` | Public | Get an active category by slug |
| `POST` | `/api/categories` | Admin | Create a category |
| `PUT` | `/api/categories/:id` | Admin | Update category fields |
| `PATCH` | `/api/categories/:id/status` | Admin | Set `isActive` |
| `DELETE` | `/api/categories/:id` | Admin | Delete category; rejected while menu items reference it |

### Menu items

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/menu` | Public | List available menu items; supports filters, sorting, and pagination |
| `GET` | `/api/menu/category/:slug` | Public | List available items in a category |
| `GET` | `/api/menu/:id` | Public | Get one available item by MongoDB ID |
| `GET` | `/api/menu/admin` | Admin or owner | List menu items, including unavailable items |
| `POST` | `/api/menu` | Admin or owner | Create a menu item |
| `PUT` | `/api/menu/:id` | Admin or owner | Update menu item fields |
| `PATCH` | `/api/menu/:id/availability` | Admin or owner | Set `isAvailable` |
| `DELETE` | `/api/menu/:id` | Admin | Delete a menu item |

Public menu list query parameters include `category`, `search`, `minPrice`, `maxPrice`, `minRating`, `popular`, `sort`, `page`, and `limit`. Supported sort values are `price_asc`, `price_desc`, `rating`, and `popular`. Results default to 12 per page and are capped at 50.

### Orders

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer | Create an order; item prices and totals are calculated from current menu records |
| `GET` | `/api/orders` | Customer | List the signed-in customer's orders |
| `GET` | `/api/orders/:id` | Customer | Get the customer's own order |
| `GET` | `/api/orders/admin` | Admin | List all orders; supports `page`, `limit`, and `status` |
| `GET` | `/api/orders/admin/:id` | Admin | Get any order by ID |
| `GET` | `/api/orders/owner` | Owner | List all orders; supports `page`, `limit`, and `status` |
| `GET` | `/api/orders/owner/:id` | Owner | Get any order by ID |
| `PATCH` | `/api/orders/:id/status` | Admin or owner | Update operational order status |
| `PATCH` | `/api/orders/:id/payment-status` | Admin | Update payment status |

Order status values are `Pending`, `Confirmed`, `Preparing`, `Ready`, `Completed`, and `Cancelled`. Status updates enforce this transition sequence: `Pending` → `Confirmed` → `Preparing` → `Ready` → `Completed`; cancellation is allowed from the non-final steps. `Completed` and `Cancelled` are final states.

### Payments

All payment endpoints require a JWT. Payment creation and verification are tied to an order owned by the authenticated user.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/payments/create-order` | Authenticated user (own order) | Create a Razorpay order and save a `Payment` record |
| `POST` | `/api/payments/verify` | Authenticated user (own payment) | Verify the Razorpay payment signature and update the payment/order |
| `POST` | `/api/payments/failed` | Authenticated user | Record a failed or dismissed checkout when the payment belongs to the user |
| `GET` | `/api/payments/admin` | Admin or owner | List payment records; supports `page` and `limit` |

### Reservations

All reservation endpoints require a JWT.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/reservations` | Customer | Create a reservation; starts with `Pending` status |
| `GET` | `/api/reservations` | Customer | List the signed-in customer's reservations |
| `GET` | `/api/reservations/admin` | Admin or owner | List all reservations |
| `PATCH` | `/api/reservations/:id/status` | Admin or owner | Set status to `Pending`, `Confirmed`, or `Cancelled` |

There is no customer cancellation endpoint, availability endpoint, or reservation email-notification endpoint at present.

### Users and profiles

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/profile` | Any authenticated role | Get the current user's profile |
| `PUT` | `/api/users/profile` | Any authenticated role | Update the current user's name, email, or phone |
| `PUT` | `/api/users/change-password` | Customer | Change password after supplying the current password |
| `GET` | `/api/users` | Admin | List users; supports `page` and `limit` |
| `GET` | `/api/users/:id` | Admin | Get a user by ID |
| `PUT` | `/api/users/:id` | Admin | Update user details, role, and/or status |
| `PATCH` | `/api/users/:id/status` | Admin | Set user status to `Active` or `Inactive` |

### Analytics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/admin` | Admin | Order/revenue/customer/reservation KPIs, seven-day revenue, category totals, and top five foods |
| `GET` | `/api/analytics/owner` | Owner | Today/weekly/monthly sales KPIs, seven-day revenue, category totals, and today's reservation count |

Analytics are computed from MongoDB data. Revenue calculations exclude cancelled orders and orders whose payment status is `Failed`.

## Authentication and Authorization

- Registration requires a name, email, and password. The API validates email format, requires a password of at least six characters, and always assigns the `customer` role. A submitted `role` is not used.
- Admin and owner accounts are created by the user seed script or by administrative/database operations; the registration endpoint cannot create privileged accounts.
- Login returns a signed JWT with the user's ID and role. The frontend stores the token in `localStorage` under `craveHouseToken` and restores the current profile on page load.
- JWT lifetime defaults to seven days and can be configured with `JWT_EXPIRES_IN`. `JWT_SECRET` is used for signing and verification.
- Passwords are hashed with bcryptjs using a cost factor of 10. The password field is excluded from regular Mongoose reads and removed from serialized user objects.
- The `protect` middleware requires a Bearer JWT. `authorize(...)` restricts a route to the listed roles. Invalid or missing tokens return HTTP 401; disallowed roles return HTTP 403.
- The frontend `ProtectedRoute` protects `/account`, `/admin/*`, and `/owner/*`. The API separately enforces authorization and customer ownership.
- Roles are `customer`, `admin`, and `owner`; there is no `staff` role.
- The `Active`/`Inactive` user status can be changed by an admin, but current authentication middleware does not reject an inactive account. Treat this as an incomplete operational control.

## Database Models

All models with timestamps have Mongoose-managed `createdAt` and `updatedAt` fields.

### `User`

- `name` (required), `email` (required, unique, trimmed/lowercased), `password` (required, hidden by default and bcrypt-hashed), optional `phone`.
- `role`: `customer`, `admin`, or `owner`; defaults to `customer`.
- `status`: `Active` or `Inactive`; defaults to `Active`.

### `Category`

- `name` (required), `slug` (required, unique, lowercase and indexed), optional `description` and `image`.
- `isActive` (indexed boolean, defaults to `true`).

### `MenuItem`

- `name`, unique lowercase `slug`, non-negative `price`, `image`, and `description` are required.
- `category` is a required ObjectId reference to `Category`.
- `rating` is 0–5; `reviewCount` is non-negative.
- `ingredients` and `tags` are string arrays. `nutrition` has string fields `calories`, `protein`, `fat`, and `carbs`.
- `isAvailable` defaults to `true`; `isPopular` defaults to `false`.

### `Order`

- `user` references `User`; `orderNumber` is unique.
- `customer` stores a name, email, and phone snapshot.
- `orderType` is `delivery`, `pickup`, or `dine-in`.
- `address` stores delivery address, city, state, pincode, and instructions. Delivery requires address, city, and pincode.
- `dineInDetails` stores table number, guest count, and instructions. Dine-in requires table number and at least one guest.
- `items` stores menu-item reference (optional), name/image/price snapshots, quantity, and subtotal.
- `pricing` stores subtotal, tax, delivery fee, discount, and total. The current order-creation controller sets tax, delivery fee, and discount to zero.
- `payment` stores method, payment status, and optional transaction ID. Method values include `COD`, `Card`, `UPI`, `NetBanking`, `online`, and `Online`; status values are `Pending`, `Paid`, `Failed`, or `Refunded`.
- `status` is `Pending`, `Confirmed`, `Preparing`, `Ready`, `Completed`, or `Cancelled`.

### `Payment`

- `order` and `user` reference `Order` and `User`.
- Stores unique `razorpayOrderId`, optional Razorpay payment ID/signature, amount, currency (defaults to `INR`), method (defaults to `online`), and status (`Created`, `Paid`, `Failed`, or `Refunded`).

### `Reservation`

- `user` references `User`; `reservationId` is unique and is generated by the API when not supplied by the request.
- Stores `customerName`, `email`, `phone`, requested `date`, `time`, `guests` (minimum 1), and optional `specialRequest`.
- `status` is `Pending`, `Confirmed`, or `Cancelled`, defaulting to `Pending`.
- `table` defaults to `T-TBD`; the current reservation flow does not assign a table based on availability.

## Seed Data

Run seed scripts from the `server` directory after configuring `server/.env` and ensuring MongoDB is available:

```powershell
npm run seed:menu
npm run seed:users
```

- `seed:menu` adds the six sample categories and their menu items. Existing category or menu-item slugs are skipped; the script does not update existing records.
- `seed:users` creates the demo admin and owner accounts only when their email addresses are not already present. Their credentials are defined in the source script and are intentionally not reproduced here. Change/remove demo credentials before using a shared or deployed environment.
- Both scripts use the Mongoose models and close the database connection when complete.

## NPM Scripts

### Frontend (project root)

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite development server |
| `build` | `npm run build` | Create the production frontend bundle in `dist/` |
| `preview` | `npm run preview` | Preview the built frontend locally (Vite default port 4173) |

### Backend (`server/`)

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Express with nodemon |
| `start` | `npm start` | Start Express with Node.js |
| `seed:menu` | `npm run seed:menu` | Seed categories and menu items |
| `seed:users` | `npm run seed:users` | Seed demo admin/owner users |

There is no automated `test` script in either `package.json`.

## Testing and Manual API Checks

The backend contains standalone scripts under `server/src/utils/` for manual API checks. They are not a test-runner suite. Read the script before running it, and run it from `server/` with the API and MongoDB available; some scripts may create or update test records.

| Script | Purpose |
|---|---|
| `testAnalyticsApi.js` | Analytics endpoint checks |
| `testMenuApi.js` | Menu/category API checks |
| `testOrder.js`, `testOrderApi.js`, `testOrderApi4C.js` | Order API scenarios |
| `testPasswordApi.js` | Password-change API checks |
| `testReservationApi.js` | Reservation API checks |
| `testUserApi.js` | Profile and user-management API checks |

Example:

```powershell
Set-Location .\server
node .\src\utils\testMenuApi.js
```

The frontend production bundle can be checked with `npm run build` from the project root.

## Troubleshooting

### MongoDB connection error

- Start the MongoDB service or confirm that Atlas is reachable.
- Check that `server/.env` exists and `MONGODB_URI` is correct.
- Confirm the MongoDB user has access to the target database.

### Missing environment variables

- Frontend settings belong in the root `.env`; backend settings belong in `server/.env`.
- Create each file from its matching `.env.example`.
- Restart the affected development server after changing environment values.

### Frontend API requests fail

- Confirm the backend is running and `GET http://localhost:5000/api/health` reports a connected database.
- Check root `VITE_API_URL` and ensure it ends with `/api`.
- Check the browser origin against the backend CORS configuration and `CLIENT_URL`.

### Razorpay checkout cannot initialize

- Verify both Razorpay values in `server/.env` are valid for the Razorpay account/environment.
- Ensure the browser can load `https://checkout.razorpay.com/v1/checkout.js`.
- Cash on delivery can still be used without configuring Razorpay.

### Port already in use

Vite may select another available port. For the backend, set a different `PORT` in `server/.env` and update the root `VITE_API_URL` to match.

## Security Notes and Limitations

- Never commit `.env` files. Keep `JWT_SECRET`, `MONGODB_URI`, and `RAZORPAY_KEY_SECRET` private.
- Replace demo users and weak/local secrets before deployment. Use HTTPS and appropriately restricted MongoDB credentials in hosted environments.
- Passwords are bcrypt-hashed and registration cannot choose a privileged role. Keep role authorization on the API; frontend route guards are not a security boundary.
- The JWT is stored in browser `localStorage`, so an XSS vulnerability could expose it. Production hardening should consider a safer session strategy and additional XSS protections.
- User `Inactive` status is not currently enforced by login or `protect`.
- The payment flow verifies a Razorpay signature but does not implement webhooks, automatic refunds, or full reconciliation.
- Reservation availability, customer cancellation, reservation notifications, and owner table occupancy are not backed by live scheduling/table data.
- Images are local asset paths or strings in menu records; there is no upload endpoint.

## Future Improvements

- Add automated frontend/backend tests and CI checks.
- Implement live reservation availability, table assignment, and customer cancellation.
- Add reservation/order email or other notification delivery.
- Enforce inactive user status in authentication and authorization.
- Add Razorpay webhooks, reconciliation, and refund handling.
- Add secure image upload/hosting and customer review submission.
- Add session refresh/rotation, request rate limiting, and production deployment configuration.

## License

License information has not been specified.
