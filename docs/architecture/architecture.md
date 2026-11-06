# Krunnex POS Architecture

## 1. Modular-Monolith Approach
Krunnex POS adopts a modular-monolith architecture for the backend. It starts as a single Java 21 Spring Boot application (`services/restaurant-api`) and a React frontend (`apps/pos-web`).
This approach provides the simplicity of a monolith for deployment and development while keeping logical boundaries strict, preventing technical debt, and preparing for future extraction if scale demands it.

## 2. Frontend and Backend Boundaries
- **Frontend (pos-web)**: A React application built with TypeScript and Vite. It is responsible for the POS user interface, offline capabilities, and user experience. It will communicate with the backend via RESTful APIs.
- **Backend (restaurant-api)**: A Java 21 Spring Boot application providing the core API. It handles business logic, security, and data access.

## 3. PostgreSQL and Flyway
- **PostgreSQL**: The primary relational database used for all persistent data storage, supporting multi-tenancy.
- **Flyway**: Used for database schema migrations. Migrations are managed alongside the backend code to ensure the database schema stays in sync with the application version.

## 4. Environment Configuration
Configuration is managed through environment variables (`.env` files in local development).
- `services/restaurant-api/.env.example` defines required backend variables like database credentials.
- `apps/pos-web/.env.example` defines frontend variables like `VITE_API_BASE_URL`.
- Docker Compose is used to orchestrate the local database.

## 5. Future Multi-Tenant Architecture
The backend will implement multi-tenancy at the database level using a shared database and shared schema approach, utilizing a `tenant_id` column on all tenant-specific tables to separate customer data securely.

## 6. Future Offline-First Architecture
The POS frontend is planned to become offline-first:
- Leveraging **IndexedDB** for local data storage of menu items, prices, and queued orders.
- Implementing an **idempotent synchronization protocol** to safely sync offline orders with the backend once the connection is restored without duplication.

## 7. Intended Deployment Topology
- **Frontend**: Vercel for global edge caching and fast delivery.
- **Backend**: Railway for easily managed, scalable Spring Boot deployment.
- **Database**: PostgreSQL on Railway or a managed provider (e.g., Supabase/Neon).

## 8. Planned Module Boundaries
The backend will be organized into logical modules:
- **Tenancy & IAM**: Authentication, authorization, and tenant isolation.
- **Catalog**: Products, modifiers, pricing, and menus.
- **Orders**: Cart management, order placement, and history.
- **Kitchen**: KDS routing and preparation status.
- **Payments**: Transaction processing and receipts.
- **Inventory**: Stock levels, recipes, and purchasing.
- **Finance & Reporting**: End-of-day operations, cash management, and sales reports.
- **Integrations**: Third-party delivery and accounting APIs.

*Note: Currently, only the foundation (health checks, database connection, initial schema) is implemented.*
