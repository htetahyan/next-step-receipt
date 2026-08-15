import { pgTable, uuid, text, numeric, timestamp, jsonb, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Existing Invoices Tables
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  date: date('date').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentMethod: text('payment_method').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  rate: numeric('rate', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

// New Consolidated Customers Table
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  passportNo: text('passport_no'),
  metadata: jsonb('metadata'), // e.g. nationality, DOB, alt contacts
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  services: many(customerServices),
  documents: many(customerDocuments),
  invoices: many(invoices),
}));

// Customer Services Table — core record for visa, tickets, etc.
export const customerServices = pgTable('customer_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'), // AE0001, TK0001, JP0001, etc.
  category: text('category').notNull(), // 'UAE Visit Visa 60 Days', 'Air Ticket', etc.
  status: text('status').default('Open').notNull(),
  details: jsonb('details').notNull().default('{}'), // specific form fields
  financials: jsonb('financials').notNull().default('{}'), // amount, supplier_cost, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customerServicesRelations = relations(customerServices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerServices.customerId],
    references: [customers.id],
  }),
  documents: many(customerDocuments),
}));

// Customer Documents Table — can attach to customer OR specific service
export const customerDocuments = pgTable('customer_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').references(() => customerServices.id, { onDelete: 'set null' }),
  tag: text('tag').notNull(), // 'Passport Copy', 'Ticket', 'Photo'
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileKey: text('file_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customerDocumentsRelations = relations(customerDocuments, ({ one }) => ({
  customer: one(customers, {
    fields: [customerDocuments.customerId],
    references: [customers.id],
  }),
  service: one(customerServices, {
    fields: [customerDocuments.serviceId],
    references: [customerServices.id],
  }),
}));

// Suppliers Table
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  services: jsonb('services').notNull().default('[]'), // array of: { serviceName: string, defaultCost: number, defaultPrice: number }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// User Profiles & Permissions Table (RBAC)
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(), // references auth.users.id
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: text('role').notNull().default('staff'), // 'admin' or 'staff'
  permissions: jsonb('permissions').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

