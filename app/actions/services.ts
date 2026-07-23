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
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customer_services')
      .select('reference_id')
      .like('reference_id', `${prefix}%`)
      .order('reference_id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0 || !data[0].reference_id) {
      return `${prefix}0001`;
    }

    const lastNum = parseInt(data[0].reference_id.replace(prefix, ''), 10);
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
    const { data: service, error: insertErr } = await supabase
      .from('customer_services')
      .insert({
        customer_id: customerId,
        reference_id: referenceId || null,
        category,
        status,
        details: details || {},
        financials: financials || {},
      })
      .select()
      .single();

    if (insertErr || !service) {
      throw new Error(insertErr?.message || 'Failed to insert customer service');
    }

    // Auto-generate invoice if there is a positive amount
    const amount = financials?.amount || 0;
    if (amount > 0) {
      const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random
      const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}${randomSuffix}`;
      
      const { data: newInvoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          customer_id: customerId,
          invoice_number: invoiceNumber,
          date: new Date().toISOString().split('T')[0],
          subtotal: amount.toString(),
          vat_amount: '0',
          total_amount: amount.toString(),
          payment_method: financials?.payment_method || 'cash',
        })
        .select()
        .single();

      if (newInvoice && !invErr) {
        await supabase
          .from('invoice_items')
          .insert({
            invoice_id: newInvoice.id,
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
  // Use Supabase REST client — same one that works for all page queries
  // This avoids Drizzle's postgres wire protocol which fails with Supabase pooler
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

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
        const { data: byPassport } = await supabase
          .from('customers')
          .select('id')
          .eq('passport_no', passportNo)
          .maybeSingle();
        if (byPassport) {
          customerId = byPassport.id;
          matched = true;
        }
      }

      if (!customerId) {
        const { data: byName } = await supabase
          .from('customers')
          .select('id')
          .eq('name', name)
          .maybeSingle();
        if (byName) {
          customerId = byName.id;
          matched = true;
        }
      }

      if (matched) {
        matchedCount++;
      } else {
        // Create new customer
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            name,
            phone: phone || null,
            email: email || null,
            passport_no: passportNo || null,
            metadata: customer.metadata || {},
          })
          .select('id')
          .single();
        if (custErr || !newCust) {
          throw new Error(custErr?.message || 'Failed to create customer');
        }
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

      const { error: svcErr } = await supabase
        .from('customer_services')
        .insert({
          customer_id: customerId,
          reference_id: referenceId,
          category: service.category,
          status: service.status || 'Open',
          details: service.details || {},
          financials: service.financials || {},
        });
      if (svcErr) {
        throw new Error(svcErr.message);
      }

      // 2b. Auto-create Supplier if mentioned and missing
      const supplierName = String(service.details?.visa_supplier || '').trim();
      if (supplierName && supplierName !== '-' && supplierName.toLowerCase() !== 'null') {
        const { data: existingSupplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('name', supplierName)
          .maybeSingle();

        if (!existingSupplier) {
          await supabase.from('suppliers').insert({
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
        const { data: newInvoice } = await supabase
          .from('invoices')
          .insert({
            customer_id: customerId,
            invoice_number: invoiceNumber,
            date: new Date().toISOString().split('T')[0],
            subtotal: amount,
            vat_amount: 0,
            total_amount: amount,
            payment_method: service.financials?.payment_method || 'cash',
          })
          .select('id')
          .single();

        if (newInvoice) {
          await supabase.from('invoice_items').insert({
            invoice_id: newInvoice.id,
            description: service.category || 'Service Fee',
            quantity: 1,
            rate: amount,
            amount: amount,
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
    data: {
      success: true,
      results,
      summary: {
        matchedCount,
        createdCount,
        errorCount,
      }
    }
  };
}

export async function updateCustomerService(serviceId: string, data: any) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: updated, error } = await supabase
      .from('customer_services')
      .update({
        category: data.category,
        status: data.status,
        details: data.details,
        financials: data.financials,
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');

    return { success: true, service: updated };
  } catch (err: any) {
    console.error('Failed to update service:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteCustomerService(serviceId: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { error } = await supabase.from('customer_services').delete().eq('id', serviceId);
    if (error) throw error;

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
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from('customer_services')
      .select('*')
      .in('category', categories as string[])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: result || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function quickUpdateService(serviceId: string, payload: { status?: string; details?: any }) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Get current details to merge
    const { data: existing, error: fetchErr } = await supabase
      .from('customer_services')
      .select('details')
      .eq('id', serviceId)
      .single();

    if (fetchErr || !existing) return { success: false, error: 'Service not found' };

    const updateData: any = {};
    if (payload.status) updateData.status = payload.status;
    if (payload.details) {
      updateData.details = {
        ...(existing.details as any || {}),
        ...payload.details,
      };
    }

    const { data: updated, error: updateErr } = await supabase
      .from('customer_services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/customers');
    return { success: true, service: updated };
  } catch (err: any) {
    console.error('Failed to quick update service:', err);
    return { success: false, error: err.message };
  }
}

