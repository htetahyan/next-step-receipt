<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# NextStep Travel & Tourism Management Platform (`next-receipt`)

Welcome! This document provides operational guidelines, architecture details, and coding conventions for AI agents and developers contributing to `next-receipt`.

---

## 1. Project Stack & Architecture

- **Framework**: Next.js 16 (App Router + Turbopack), React 19, TypeScript 5
- **Database**: Supabase PostgreSQL with REST Client (`@supabase/supabase-js`, `@supabase/ssr`) & Drizzle ORM (`db/schema.ts`)
- **File Storage**: Cloudflare R2 via AWS S3 Client (`@aws-sdk/client-s3`, presigned URLs)
- **Validation**: Zod (`lib/validations/serviceSchemas.ts`)
- **Styling**: Tailwind CSS v4 & Vanilla CSS variables (`app/globals.css`)
- **Icons**: Lucide React (`lucide-react`)
- **Notifications**: Sonner (`sonner`)

---

## 2. Directory Structure

```
next-receipt/
├── app/
│   ├── actions/          # Server Actions (customers, services, documents, invoices, r2, etc.)
│   ├── api/              # API Routes (parse-passport, uploadthing)
│   ├── dashboard/        # Dashboard layout and feature routes (uae-visa, air-tickets, etc.)
│   └── portal/           # Customer Portal route
├── components/           # Reusable Client & Server UI Components
├── db/                   # Drizzle ORM schema & DB connection client
├── lib/                  # Utilities, Zod schemas, safeAction handler
├── sql/
│   └── migrations/       # Raw SQL migration scripts & performance indexes
└── utils/
    └── supabase/         # Server & Client Supabase helpers
```

---

## 3. Critical Agent Rules & Coding Guidelines

### Data Fetching & Performance Optimization
1. **Targeted Field Selection**: Never perform wildcard `select('*')` on large tables (`customer_services`, `invoices`, `customers`) during main dashboard or listing page queries. Always explicitly request the required columns (`select('id, reference_id, category, status, ...')`).
2. **Dropdown Option Limits**: When pre-loading customer dropdown options in list pages, limit the query to top 100 entries (`.order('created_at', { ascending: false }).limit(100)`). Use dynamic search actions (`searchCustomers`) for live user autocomplete.
3. **Multi-Field Database Search**: Customer searches must query across `name`, `passport_no`, `phone`, and `email` using Supabase `.or(...)` filters to ensure high accuracy.
4. **Database Indexes**: Keep database indexes updated in `sql/migrations/`. Ensure foreign key lookup columns (`customer_id`, `service_id`) and search target columns (`passport_no`, `reference_id`, `created_at DESC`) are indexed.

### Server Actions & Authentication
1. **Top-Level Server Client Imports**: Import `createClient` from `@/utils/supabase/server` at the top of server action modules.
2. **Authentication Verification**: Always authenticate requests using `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();` before executing mutations.
3. **Path Revalidation**: Use `revalidatePath(...)` safely after data mutations (insert, update, delete) to keep UI caches fresh.

### UI & Styling Guidelines
1. **Design System & Aesthetics**: Maintain sleek dark/light card aesthetics, soft borders (`border-[var(--card-border)]`), curated badge colors, and smooth micro-animations.
2. **Icons**: Use icons exclusively from `lucide-react`.

---

## 4. Key Verification Commands

```bash
# Production build verification (TypeScript checks & Turbopack compile)
npm run build

# Development server
npm run dev

# Database schema migrations
npx tsx run-migration.ts
```
