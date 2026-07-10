'use server';

import { db } from '@/db';
import { customerServices, invoices, invoiceItems, customers, suppliers } from '@/db/schema';
import { eq, desc, like, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';



import { uaeVisaSchema, airTicketSchema, otherVisaSchema } from '@/lib/validations/serviceSchemas';

// ── Schema ──────────────────────────────────────────────────
// We will now use the shared schemas directly to ensure frontend/backend parity.
// Note: We'll need a unified validation for the 'add' action.


// ── Generate Reference ID ───────────────────────────────────
export async function generateReferenceId(prefix: string): Promise<string> {
  try {
    // Find the highest existing reference ID with this prefix
    const result = await db
      .select({ referenceId: customerServices.referenceId })
      .from(customerServices)
      .where(like(customerServices.referenceId, `${prefix}%`))
      .orderBy(desc(customerServices.referenceId))
      .limit(1);

    if (result.length === 0 || !result[0].referenceId) {
      return `${prefix}0001`;
    }

    const lastNum = parseInt(result[0].referenceId.replace(prefix, ''), 10);
    const nextNum = (lastNum + 1).toString().padStart(4, '0');
    return `${prefix}${nextNum}`;
  } catch {
    // Fallback
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}${rand}`;
  }
}

import { safeAction } from '@/lib/safeAction';

// ── Add Service ─────────────────────────────────────────────
export async function addCustomerService(data: any) {
  return safeAction(async (data: any) => {
    // 1. Authenticate user
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { customerId, referenceId, category, status, details, financials } = data;

    // 2. Validate input using Zod schemas based on category
    // Depending on form input structure, isNewCustomer/newCustomer might not be present or validated if existing customer is selected.
    // So we can perform a partial or conditional validation.
    const validationData = {
      customerId,
      isNewCustomer: false,
      status,
      category,
      details: details || {},
      financials: financials || {},
    };

    if (category && (category.startsWith('Visa Extension') || category.includes('Visa'))) {
      uaeVisaSchema.parse(validationData);
    } else if (category === 'Air Ticket' || category === 'Flight Booking') {
      airTicketSchema.parse(validationData);
    } else {
      otherVisaSchema.parse(validationData);
    }

    // Insert the service
    const [service] = await db.insert(customerServices).values({
      customerId,
      referenceId: referenceId || null,
      category,
      status,
      details,
      financials,
    }).returning();

    // Auto-generate invoice if there is a positive amount
    const amount = financials?.amount || 0;
    if (amount > 0) {
      // Add randomness to prevent collisions
      const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random
      const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}${randomSuffix}`;
      const [newInvoice] = await db.insert(invoices).values({
        customerId: customerId,
        invoiceNumber: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        subtotal: amount.toString(),
        vatAmount: '0',
        totalAmount: amount.toString(),
        paymentMethod: financials?.payment_method || 'cash',
      }).returning();

      if (newInvoice) {
        await db.insert(invoiceItems).values({
          invoiceId: newInvoice.id,
          description: category || 'Service Fee',
          quantity: '1',
          rate: amount.toString(),
          amount: amount.toString(),
        });
      }
    }
    return service;
  }, ['/dashboard/customers', '/dashboard/uae-visa', '/dashboard/air-tickets', '/dashboard/other-visa'], data);
}

// ── Bulk Migrate Services ───────────────────────────────────
export async function bulkMigrateCustomerServices(records: any[]) {
  return safeAction(async (records: any[]) => {
    const results = [];
    let matchedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const { customer, service } = record;
        const name = String(customer.name || '').trim();
        if (!name) {
          results.push({ success: false, message: `Row ${i + 1}: Skipped (No Customer Name found).` });
          continue;
        }

        const passportNo = String(customer.passportNo || '').trim().replace(/\s+/g, '').toUpperCase();
        const phone = String(customer.phone || '').trim();
        const email = String(customer.email || '').trim();

        // 1. Smart Deduplication: Check if customer already exists in DB
        let customerId = '';
        let matched = false;

        if (passportNo) {
          const [byPassport] = await db
            .select()
            .from(customers)
            .where(eq(customers.passportNo, passportNo))
            .limit(1);
          if (byPassport) {
            customerId = byPassport.id;
            matched = true;
          }
        }

        if (!customerId) {
          const [byName] = await db
            .select()
            .from(customers)
            .where(eq(customers.name, name))
            .limit(1);
          if (byName) {
            customerId = byName.id;
            matched = true;
          }
        }

        if (matched) {
          matchedCount++;
        } else {
          // Create new customer
          const [newCust] = await db.insert(customers).values({
            name,
            phone: phone || null,
            email: email || null,
            passportNo: passportNo || null,
            metadata: customer.metadata || {},
          }).returning();
          customerId = newCust.id;
          createdCount++;
        }

        // 2. Insert Service
        let referenceId = service.referenceId || null;
        if (!referenceId) {
          const cat = String(service.category || '').toLowerCase();
          const prefix = cat.includes('ticket') ? 'TK' : cat.includes('uae') ? 'AE' : 'OT';
          referenceId = await generateReferenceId(prefix);
        }

        const [insertedService] = await db.insert(customerServices).values({
          customerId,
          referenceId,
          category: service.category,
          status: service.status || 'Open',
          details: service.details || {},
          financials: service.financials || {},
        }).returning();

        // 2b. Auto-create Supplier if mentioned and missing
        const supplierName = String(service.details?.visa_supplier || '').trim();
        if (supplierName && supplierName !== '-' && supplierName.toLowerCase() !== 'null') {
          const [existingSupplier] = await db
            .select()
            .from(suppliers)
            .where(eq(suppliers.name, supplierName))
            .limit(1);

          if (!existingSupplier) {
            await db.insert(suppliers).values({
              name: supplierName,
              services: [{
                serviceName: service.category || 'UAE Visit Visa 30 Days',
                defaultCost: service.financials?.supplier_cost || 0,
                defaultPrice: service.financials?.amount || 0
              }]
            });
          }
        }

        // 3. Auto-generate invoice if positive amount
        const amount = service.financials?.amount || 0;
        if (amount > 0) {
          const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
          const [newInvoice] = await db.insert(invoices).values({
            customerId: customerId,
            invoiceNumber: invoiceNumber,
            date: new Date().toISOString().split('T')[0],
            subtotal: amount.toString(),
            vatAmount: '0',
            totalAmount: amount.toString(),
            paymentMethod: service.financials?.payment_method || 'cash',
          }).returning();

          if (newInvoice) {
            await db.insert(invoiceItems).values({
              invoiceId: newInvoice.id,
              description: service.category || 'Service Fee',
              quantity: '1',
              rate: amount.toString(),
              amount: amount.toString(),
            });
          }
        }

        results.push({
          success: true,
          message: `Row ${i + 1}: ${matched ? 'Matched' : 'Created'} customer "${name}", migrated service ${service.referenceId || ''}`,
        });

      } catch (err: any) {
        errorCount++;
        results.push({
          success: false,
          message: `Row ${i + 1}: Error - ${err.message}`,
        });
      }
    }

    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');

    return {
      success: true,
      results,
      summary: {
        matchedCount,
        createdCount,
        errorCount,
      }
    };
  }, ['/dashboard/customers', '/dashboard/uae-visa', '/dashboard/air-tickets', '/dashboard/other-visa'], records);
}

// ── Update Service ──────────────────────────────────────────
export async function updateCustomerService(serviceId: string, data: any) {
  try {
    // 1. Authenticate user
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Validate input using Zod schemas based on category
    const validationData = {
      customerId: data.customerId,
      isNewCustomer: false,
      status: data.status,
      category: data.category,
      details: data.details || {},
      financials: data.financials || {},
    };

    if (data.category && (data.category.startsWith('Visa Extension') || data.category.includes('Visa'))) {
      uaeVisaSchema.parse(validationData);
    } else if (data.category === 'Air Ticket' || data.category === 'Flight Booking') {
      airTicketSchema.parse(validationData);
    } else {
      otherVisaSchema.parse(validationData);
    }

    const [updated] = await db
      .update(customerServices)
      .set({
        category: data.category,
        status: data.status,
        details: data.details,
        financials: data.financials,
      })
      .where(eq(customerServices.id, serviceId))
      .returning();

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');

    return { success: true, service: updated };
  } catch (err: any) {
    console.error('Failed to update service:', err);
    return { success: false, error: err.message };
  }
}

// ── Delete Service ──────────────────────────────────────────
export async function deleteCustomerService(serviceId: string) {
  try {
    await db.delete(customerServices).where(eq(customerServices.id, serviceId));
    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Fetch Services by Category Group ────────────────────────
export async function fetchServicesByCategories(categories: readonly string[]) {
  try {
    const result = await db
      .select()
      .from(customerServices)
      .where(
        sql`${customerServices.category} = ANY(${categories})`
      )
      .orderBy(desc(customerServices.createdAt));

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ── Quick Update Service Status/Details ─────────────────────
export async function quickUpdateService(serviceId: string, payload: { status?: string; details?: any }) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const [existing] = await db
      .select()
      .from(customerServices)
      .where(eq(customerServices.id, serviceId))
      .limit(1);

    if (!existing) return { success: false, error: 'Service not found' };

    const updateData: any = {};
    if (payload.status) updateData.status = payload.status;
    if (payload.details) {
      updateData.details = {
        ...(existing.details as any || {}),
        ...payload.details,
      };
    }

    const [updated] = await db
      .update(customerServices)
      .set(updateData)
      .where(eq(customerServices.id, serviceId))
      .returning();

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/customers');
    return { success: true, service: updated };
  } catch (err: any) {
    console.error('Failed to quick update service:', err);
    return { success: false, error: err.message };
  }
}

