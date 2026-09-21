'use server';

import { db } from '@/db';
import { customerServices, invoices, invoiceItems, customers, suppliers } from '@/db/schema';
import { eq, desc, like, or, sql } from 'drizzle-orm';
import { after } from 'next/server';
import { refresh } from 'next/cache';
import { revalidateAfter, SERVICE_DASHBOARD_PATHS } from '@/lib/revalidate';
import { z } from 'zod';
import { SERVICE_LIST_SELECT, fetchModuleServiceList, ListFilter } from '@/lib/service-list-query';



import { uaeVisaSchema, airTicketSchema, otherVisaSchema, tourPackageSchema } from '@/lib/validations/serviceSchemas';
import { createClient } from '@/utils/supabase/server';
import { requirePermission } from '@/app/actions/users';
import { mapCategoryToModule } from '@/lib/auth-permissions';
import { stampBookingDate, getBookingDateISO } from '@/lib/serviceDates';

// ── Schema ──────────────────────────────────────────────────
// We will now use the shared schemas directly to ensure frontend/backend parity.
// Note: We'll need a unified validation for the 'add' action.


// ── Generate Reference ID ───────────────────────────────────
export async function generateReferenceId(prefix: string): Promise<string> {
  try {
    const supabase = await createClient();
    const cleanPrefix = (prefix || 'REF').toUpperCase().trim();
    
    const { data, error } = await supabase
      .from('customer_services')
      .select('reference_id')
      .ilike('reference_id', `${cleanPrefix}%`)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error || !data || data.length === 0) {
      return `${cleanPrefix}0001`;
    }

    let maxNum = 0;
    for (const row of data) {
      if (!row.reference_id) continue;
      // Match any digits following the prefix, optional dashes, slashes, or spaces
      // e.g. AE0001, AE002, AE-0003, AE 0004
      const match = String(row.reference_id).match(new RegExp(`^${cleanPrefix}[-\\s/]?(\\d+)`, 'i'));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = (maxNum + 1).toString().padStart(4, '0');
    return `${cleanPrefix}${nextNum}`;
  } catch (err) {
    console.error('Error generating reference id:', err);
    return `${(prefix || 'REF').toUpperCase().trim()}0001`;
  }
}

function parseDateToISO(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal.toISOString();
  const str = String(dateVal).trim();
  if (!str) return null;
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(str)) {
    const parts = str.split(/[\/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

import { safeAction } from '@/lib/safeAction';

export async function loadModuleServiceList(filter: ListFilter = {}) {
  try {
    const data = await fetchModuleServiceList(filter);
    return { success: true, data };
  } catch (err: any) {
    console.error('loadModuleServiceList error:', err);
    return { success: false, data: [] as any[], error: err.message };
  }
}

export async function findServicesByReferenceId(referenceId: string, excludeId?: string) {
  try {
    const clean = String(referenceId || '').trim();
    if (!clean) return { success: true, data: [] as any[] };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customer_services')
      .select('id, reference_id, customer_id, category, status, customers(name)')
      .ilike('reference_id', clean)
      .limit(10);
    if (error) throw error;
    const rows = (data || []).filter((row: any) => !excludeId || row.id !== excludeId);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, data: [] as any[], error: err.message };
  }
}

async function syncLinkedInvoice(
  supabase: any,
  customerId: string,
  financials: any,
  category?: string
) {
  const amount = Number(financials?.amount) || 0;
  const invoiceId = financials?.invoice_id;
  if (!invoiceId || amount <= 0) return;

  try {
    await supabase
      .from('invoices')
      .update({
        subtotal: amount.toString(),
        total_amount: amount.toString(),
        payment_method: financials?.payment_method || undefined,
      })
      .eq('id', invoiceId)
      .eq('customer_id', customerId);

    const { data: items } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', invoiceId)
      .limit(1);

    if (items?.[0]?.id) {
      await supabase
        .from('invoice_items')
        .update({
          rate: amount.toString(),
          amount: amount.toString(),
          description: category || 'Service Fee',
        })
        .eq('id', items[0].id);
    }
  } catch (err) {
    console.error('Non-critical invoice sync error:', err);
  }
}

export async function searchServices(
  query: string,
  filter?: { inCategories?: string[]; notInCategories?: string[] }
) {
  try {
    const raw = query.trim();
    if (raw.length < 2) return { success: true, data: [] as any[] };

    const sanitized = raw.replace(/[,():;'"*]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!sanitized) return { success: true, data: [] as any[] };

    const supabase = await createClient();

    const applyFilter = (q: any) => {
      if (filter?.inCategories?.length) q = q.in('category', filter.inCategories);
      if (filter?.notInCategories?.length) {
        q = q.not('category', 'in', `("${filter.notInCategories.join('","')}")`);
      }
      return q;
    };

    const refQuery = applyFilter(
      supabase
        .from('customer_services')
        .select(SERVICE_LIST_SELECT)
        .ilike('reference_id', `%${sanitized}%`)
        .order('created_at', { ascending: false })
        .limit(40)
    );

    const { data: matchedCustomers } = await supabase
      .from('customers')
      .select('id')
      .or(`name.ilike.%${sanitized}%,passport_no.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
      .limit(40);

    const customerIds = (matchedCustomers || []).map((c: any) => c.id);
    const customerQuery = customerIds.length
      ? applyFilter(
          supabase
            .from('customer_services')
            .select(SERVICE_LIST_SELECT)
            .in('customer_id', customerIds)
            .order('created_at', { ascending: false })
            .limit(60)
        )
      : Promise.resolve({ data: [] as any[] });

    const [refRes, customerRes] = await Promise.all([refQuery, customerQuery]);
    const merged = new Map<string, any>();
    for (const row of [...((refRes as any).data || []), ...((customerRes as any).data || [])]) {
      merged.set(row.id, row);
    }

    return { success: true, data: Array.from(merged.values()) };
  } catch (err: any) {
    console.error('searchServices error:', err);
    return { success: false, data: [] as any[], error: err.message };
  }
}

// ── Add Service ─────────────────────────────────────────────
export async function addCustomerService(data: any) {
  try {
    let { customerId, referenceId, category, status, details, financials, newCustomer } = data || {};

    const moduleKey = mapCategoryToModule(category);
    const userProfile = await requirePermission(moduleKey, 'create');
    const supabase = await createClient();

    if (!customerId && newCustomer?.name) {
      await requirePermission('customers', 'create');
      const { data: createdCustomer, error: custErr } = await supabase
        .from('customers')
        .insert({
          name: String(newCustomer.name).trim(),
          phone: newCustomer.phone || null,
          email: newCustomer.email || null,
          passport_no: newCustomer.passport_no || null,
          metadata: {},
        })
        .select('id')
        .single();

      if (custErr || !createdCustomer) {
        throw new Error(custErr?.message || 'Failed to create customer');
      }
      customerId = createdCustomer.id;
    }

    if (!customerId) {
      return { success: false, error: 'Customer ID is required' };
    }

    const defaultHandledBy = userProfile.fullName || (userProfile.email ? userProfile.email.split('@')[0] : '');
    const finalDetails = {
      ...(details || {}),
      handled_by: details?.handled_by?.trim() !== undefined && details?.handled_by?.trim() !== '' 
        ? details.handled_by.trim() 
        : defaultHandledBy,
    };

    // 2. Validate input using Zod schemas based on moduleKey
    const validationData = {
      customerId,
      isNewCustomer: false,
      status: status || 'Open',
      category: category || 'Service',
      details: finalDetails,
      financials: financials || {},
    };

    try {
      if (moduleKey === 'tour_packages') {
        tourPackageSchema.parse(validationData);
      } else if (moduleKey === 'air_tickets') {
        airTicketSchema.parse(validationData);
      } else if (moduleKey === 'other_visa') {
        otherVisaSchema.parse(validationData);
      } else {
        uaeVisaSchema.parse(validationData);
      }
    } catch (zodErr: any) {
      console.warn('Schema validation warning (proceeding with normalized payload):', zodErr?.message);
    }

    const stampedDetails = stampBookingDate(finalDetails, { fallbackToday: true });
    const bookingISO = parseDateToISO(getBookingDateISO({ details: stampedDetails, created_at: null }) || stampedDetails.booking_date);
    const serviceInsertPayload: any = {
      customer_id: customerId,
      reference_id: referenceId || null,
      category: category || 'Service',
      status: status || 'Open',
      details: stampedDetails,
      financials: financials || {},
    };

    // Insert the service
    const { data: service, error: insertErr } = await supabase
      .from('customer_services')
      .insert(serviceInsertPayload)
      .select('id, reference_id, customer_id, category, status, details, financials, created_at')
      .single();

    if (insertErr || !service) {
      throw new Error(insertErr?.message || 'Failed to insert customer service');
    }

    const amount = Number(financials?.amount) || 0;
    if (amount > 0) {
      const invoiceCustomerId = customerId;
      const invoiceCategory = category;
      const invoicePayment = financials?.payment_method || 'cash';
      const invoiceDateISO = bookingISO;
      after(async () => {
        try {
          const sb = await createClient();
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}${randomSuffix}`;
          const invoiceInsertPayload: any = {
            customer_id: invoiceCustomerId,
            invoice_number: invoiceNumber,
            date: invoiceDateISO ? invoiceDateISO.split('T')[0] : new Date().toISOString().split('T')[0],
            subtotal: amount.toString(),
            vat_amount: '0',
            total_amount: amount.toString(),
            payment_method: invoicePayment,
          };
          if (invoiceDateISO) {
            invoiceInsertPayload.created_at = invoiceDateISO;
          }

          const { data: newInvoice, error: invErr } = await sb
            .from('invoices')
            .insert(invoiceInsertPayload)
            .select('id')
            .single();

          if (newInvoice && !invErr) {
            await sb.from('invoice_items').insert({
              invoice_id: newInvoice.id,
              description: invoiceCategory || 'Service Fee',
              quantity: '1',
              rate: amount.toString(),
              amount: amount.toString(),
            });
            await sb
              .from('customer_services')
              .update({
                financials: { ...(financials || {}), invoice_id: newInvoice.id },
              })
              .eq('id', service.id);
          }
        } catch (invError: any) {
          console.error('Non-critical invoice generation error:', invError);
        }
      });
    }

    revalidateAfter(SERVICE_DASHBOARD_PATHS);
    try {
      refresh();
    } catch {
      // refresh() is a no-op outside a Server Action request
    }

    return { success: true, service, data: service };
  } catch (err: any) {
    console.error('Failed to add customer service:', err);
    return { success: false, error: err.message || 'Failed to create service' };
  }
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

      // Match by passport/ID number: if client exists in DB with this passport, reuse profile (no duplicate)
      if (passportNo) {
        const { data: byPassport } = await supabase
          .from('customers')
          .select('id, name, passport_no')
          .eq('passport_no', passportNo)
          .maybeSingle();
        if (byPassport) {
          customerId = byPassport.id;
          matched = true;
        }
      }

      // If no passport was provided, match ONLY if both phone and name match (names can duplicate, so name alone is never matched)
      if (!customerId && !passportNo && phone && phone.length >= 7) {
        const { data: byPhoneAndName } = await supabase
          .from('customers')
          .select('id, name, phone, passport_no')
          .eq('phone', phone)
          .ilike('name', name)
          .maybeSingle();
        if (byPhoneAndName) {
          customerId = byPhoneAndName.id;
          matched = true;
        }
      }

      if (matched) {
        matchedCount++;
      } else {
        // Create new customer (names can duplicate; separate people with same name get their own profile)
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

      // 2. Strict Service Deduplication
      let referenceId = service.referenceId ? String(service.referenceId).trim() : null;
      if (referenceId) {
        const { data: existingSvc } = await supabase
          .from('customer_services')
          .select('id, reference_id')
          .ilike('reference_id', referenceId)
          .maybeSingle();

        if (existingSvc) {
          matchedCount++;
          results.push({
            success: true,
            message: `Skipped duplicate: Reference ID "${referenceId}" already exists in database for "${name}".`
          });
          continue;
        }
      }

      // 2b. Check if this customer (by matched ID / name / passport) already has the exact service
      if (matched && customerId) {
        const targetDate = service.details?.travel_date || service.details?.application_date || service.details?.visa_issued_date;
        const { data: existingCustomerServices } = await supabase
          .from('customer_services')
          .select('id, reference_id, category, details')
          .eq('customer_id', customerId)
          .eq('category', service.category);

        if (existingCustomerServices && existingCustomerServices.length > 0) {
          const duplicateFound = existingCustomerServices.find((s: any) => {
            const d = s.details as any;
            if (!targetDate) return true; // Identical customer & category
            return d?.travel_date === targetDate || d?.application_date === targetDate || d?.visa_issued_date === targetDate;
          });

          if (duplicateFound) {
            matchedCount++;
            results.push({
              success: true,
              message: `Skipped duplicate: Customer "${name}" (Passport: ${passportNo || 'N/A'}) already has a "${service.category}" service (Ref: ${duplicateFound.reference_id || '—'}).`
            });
            continue;
          }
        }
      }

      if (!referenceId) {
        const cat = String(service.category || '').toLowerCase();
        const prefix = cat.includes('ticket') ? 'TK' : cat.includes('tour') ? 'TP' : cat.includes('uae') ? 'AE' : 'OT';
        referenceId = await generateReferenceId(prefix);
      }

      const stampedDetails = stampBookingDate(service.details || {}, { fallbackToday: true });
      const bookingISO = parseDateToISO(stampedDetails.booking_date);

      const servicePayload: any = {
        customer_id: customerId,
        reference_id: referenceId,
        category: service.category,
        status: service.status || 'Open',
        details: stampedDetails,
        financials: service.financials || {},
      };

      const { error: svcErr } = await supabase
        .from('customer_services')
        .insert(servicePayload);
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
        const invoicePayload: any = {
          customer_id: customerId,
          invoice_number: invoiceNumber,
          date: bookingISO ? bookingISO.split('T')[0] : new Date().toISOString().split('T')[0],
          subtotal: amount,
          vat_amount: 0,
          total_amount: amount,
          payment_method: service.financials?.payment_method || 'cash',
        };
        if (bookingISO) {
          invoicePayload.created_at = bookingISO;
        }

        const { data: newInvoice } = await supabase
          .from('invoices')
          .insert(invoicePayload)
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

  revalidateAfter(SERVICE_DASHBOARD_PATHS);

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
    const moduleKey = mapCategoryToModule(data.category);
    await requirePermission(moduleKey, 'edit');

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const updatePayload: any = {
      category: data.category,
      status: data.status,
      details: stampBookingDate(data.details || {}),
      financials: data.financials,
    };

    if (data.referenceId !== undefined) {
      updatePayload.reference_id = data.referenceId ? String(data.referenceId).trim() : null;
    }

    const { data: updated, error } = await supabase
      .from('customer_services')
      .update(updatePayload)
      .eq('id', serviceId)
      .select('id, reference_id, customer_id, category, status, details, financials, created_at')
      .single();

    if (error) throw error;

    await syncLinkedInvoice(supabase, updated.customer_id, updatePayload.financials, data.category);

    revalidateAfter(SERVICE_DASHBOARD_PATHS);
    try { refresh(); } catch { /* ignore */ }

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

    // Fetch existing category to check permission for that specific module
    const { data: existing } = await supabase
      .from('customer_services')
      .select('category')
      .eq('id', serviceId)
      .maybeSingle();

    const moduleKey = mapCategoryToModule(existing?.category);
    await requirePermission(moduleKey, 'delete');

    const { error } = await supabase.from('customer_services').delete().eq('id', serviceId);
    if (error) throw error;

    revalidateAfter(SERVICE_DASHBOARD_PATHS);
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
      .select('id, reference_id, customer_id, category, status, details, financials, created_at')
      .in('category', categories as string[])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: result || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function updateServiceRefId(serviceId: string, referenceId: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('customer_services')
      .select('id, category')
      .eq('id', serviceId)
      .maybeSingle();

    if (fetchErr || !existing) return { success: false, error: 'Service record not found' };

    const moduleKey = mapCategoryToModule(existing.category);
    await requirePermission(moduleKey, 'edit');

    const cleanRef = referenceId ? referenceId.trim().toUpperCase() : null;

    const { error } = await supabase
      .from('customer_services')
      .update({ reference_id: cleanRef })
      .eq('id', serviceId);

    if (error) throw error;

    revalidateAfter(SERVICE_DASHBOARD_PATHS);

    return { success: true, reference_id: cleanRef };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update Reference ID' };
  }
}

export async function quickUpdateService(
  serviceId: string,
  payload: {
    status?: string;
    category?: string;
    reference_id?: string;
    referenceId?: string;
    details?: any;
    financials?: any;
    customer?: {
      name?: string;
      phone?: string;
      passport_no?: string;
    };
  }
) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Get current record to merge details and financials
    const { data: existing, error: fetchErr } = await supabase
      .from('customer_services')
      .select('id, customer_id, category, status, details, financials')
      .eq('id', serviceId)
      .single();

    if (fetchErr || !existing) return { success: false, error: 'Service record not found' };

    const moduleKey = mapCategoryToModule(payload.category || existing.category);
    await requirePermission(moduleKey, 'edit');

    const updateData: any = {};
    if (payload.status) updateData.status = payload.status;
    if (payload.category) updateData.category = payload.category;

    if (payload.reference_id !== undefined || payload.referenceId !== undefined) {
      const refVal = payload.reference_id !== undefined ? payload.reference_id : payload.referenceId;
      updateData.reference_id = refVal ? String(refVal).trim().toUpperCase() : null;
    }

    if (payload.details) {
      updateData.details = stampBookingDate({
        ...(existing.details as any || {}),
        ...payload.details,
      });
    }

    if (payload.financials) {
      updateData.financials = {
        ...(existing.financials as any || {}),
        ...payload.financials,
      };
    }

    // Update service
    const { data: updated, error: updateErr } = await supabase
      .from('customer_services')
      .update(updateData)
      .eq('id', serviceId)
      .select('id, reference_id, customer_id, category, status, details, financials, created_at, customers(id, name, phone, email, passport_no)')
      .single();

    if (updateErr) throw updateErr;

    // Update customer info if provided
    if (payload.customer && existing.customer_id) {
      const custData: any = {};
      if (payload.customer.name !== undefined) custData.name = payload.customer.name;
      if (payload.customer.phone !== undefined) custData.phone = payload.customer.phone;
      if (payload.customer.passport_no !== undefined) custData.passport_no = payload.customer.passport_no;

      if (Object.keys(custData).length > 0) {
        const { data: updatedCust } = await supabase
          .from('customers')
          .update(custData)
          .eq('id', existing.customer_id)
          .select('id, name, phone, email, passport_no')
          .single();

        if (updatedCust && updated) {
          updated.customers = updatedCust;
        }
      }
    }

    await syncLinkedInvoice(supabase, existing.customer_id, updated.financials, updated.category);

    revalidateAfter(SERVICE_DASHBOARD_PATHS);
    try { refresh(); } catch { /* ignore */ }
    return { success: true, service: updated };
  } catch (err: any) {
    console.error('Failed to quick update service:', err);
    return { success: false, error: err.message || 'Database update error' };
  }
}

// ── Close Services Expired Over 1 Month (30 Days) ───────────
export async function closeExpiredServices(daysOver: number = 30) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Fetch active services
    const { data: services, error } = await supabase
      .from('customer_services')
      .select('id, reference_id, category, status, details, customers(name)')
      .not('status', 'in', '("Closed","Cancelled")');

    if (error) throw error;
    if (!services || services.length === 0) {
      return { success: true, count: 0, message: 'No active services found.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() - daysOver);

    const toCloseIds: string[] = [];

    for (const service of services) {
      const details = (service.details as any) || {};
      const expiryStr = details.visa_expiry_date || details.travel_date || details.departure_date;
      if (!expiryStr) continue;

      const expDate = new Date(expiryStr);
      if (isNaN(expDate.getTime())) continue;

      if (expDate <= thresholdDate) {
        toCloseIds.push(service.id);
      }
    }

    if (toCloseIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('customer_services')
        .update({ status: 'Closed' })
        .in('id', toCloseIds);

      if (updateErr) throw updateErr;

      revalidateAfter(SERVICE_DASHBOARD_PATHS);
    }

    return {
      success: true,
      count: toCloseIds.length,
      message: `Successfully closed ${toCloseIds.length} visa service records expired over ${daysOver} days!`,
    };
  } catch (err: any) {
    console.error('Failed to close expired services:', err);
    return { success: false, error: err.message, count: 0 };
  }
}


