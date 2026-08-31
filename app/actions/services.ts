'use server';

import { db } from '@/db';
import { customerServices, invoices, invoiceItems, customers, suppliers } from '@/db/schema';
import { eq, desc, like, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';



import { uaeVisaSchema, airTicketSchema, otherVisaSchema, tourPackageSchema } from '@/lib/validations/serviceSchemas';
import { createClient } from '@/utils/supabase/server';
import { requirePermission } from '@/app/actions/users';
import { mapCategoryToModule } from '@/lib/auth-permissions';

// ── Schema ──────────────────────────────────────────────────
// We will now use the shared schemas directly to ensure frontend/backend parity.
// Note: We'll need a unified validation for the 'add' action.


// ── Generate Reference ID ───────────────────────────────────
export async function generateReferenceId(prefix: string): Promise<string> {
  try {
    const supabase = await createClient();
    const cleanPrefix = (prefix || 'REF').toUpperCase().trim();
    
    // Fetch recent matching reference_ids to find the highest sequence number
    const { data, error } = await supabase
      .from('customer_services')
      .select('reference_id')
      .ilike('reference_id', `${cleanPrefix}%`)
      .order('created_at', { ascending: false })
      .limit(300);

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

// ── Add Service ─────────────────────────────────────────────
export async function addCustomerService(data: any) {
  try {
    const { customerId, referenceId, category, status, details, financials } = data || {};

    if (!customerId) {
      return { success: false, error: 'Customer ID is required' };
    }

    // Check RBAC permission for this specific service module
    const moduleKey = mapCategoryToModule(category);
    const userProfile = await requirePermission(moduleKey, 'create');

    const defaultHandledBy = userProfile.fullName || (userProfile.email ? userProfile.email.split('@')[0] : '');
    const finalDetails = {
      ...(details || {}),
      handled_by: details?.handled_by?.trim() !== undefined && details?.handled_by?.trim() !== '' 
        ? details.handled_by.trim() 
        : defaultHandledBy,
    };

    const supabase = await createClient();

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

    const effectiveDateISO = parseDateToISO(finalDetails?.travel_date || finalDetails?.visa_issued_date);
    const serviceInsertPayload: any = {
      customer_id: customerId,
      reference_id: referenceId || null,
      category: category || 'Service',
      status: status || 'Open',
      details: finalDetails,
      financials: financials || {},
    };
    if (effectiveDateISO) {
      serviceInsertPayload.created_at = effectiveDateISO;
    }

    // Insert the service
    const { data: service, error: insertErr } = await supabase
      .from('customer_services')
      .insert(serviceInsertPayload)
      .select()
      .single();

    if (insertErr || !service) {
      throw new Error(insertErr?.message || 'Failed to insert customer service');
    }

    // Auto-generate invoice if there is a positive amount
    const amount = Number(financials?.amount) || 0;
    if (amount > 0) {
      try {
        const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random
        const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}${randomSuffix}`;
        
        const invoiceInsertPayload: any = {
          customer_id: customerId,
          invoice_number: invoiceNumber,
          date: effectiveDateISO ? effectiveDateISO.split('T')[0] : new Date().toISOString().split('T')[0],
          subtotal: amount.toString(),
          vat_amount: '0',
          total_amount: amount.toString(),
          payment_method: financials?.payment_method || 'cash',
        };
        if (effectiveDateISO) {
          invoiceInsertPayload.created_at = effectiveDateISO;
        }

        const { data: newInvoice, error: invErr } = await supabase
          .from('invoices')
          .insert(invoiceInsertPayload)
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
      } catch (invError: any) {
        console.error('Non-critical invoice generation error:', invError);
      }
    }

    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
    revalidatePath('/dashboard/tour-packages');
    revalidatePath('/dashboard/custom-service');
    revalidatePath('/dashboard');

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

      const effectiveDateISO = parseDateToISO(service.details?.travel_date || service.details?.visa_issued_date);

      const servicePayload: any = {
        customer_id: customerId,
        reference_id: referenceId,
        category: service.category,
        status: service.status || 'Open',
        details: service.details || {},
        financials: service.financials || {},
      };
      if (effectiveDateISO) {
        servicePayload.created_at = effectiveDateISO;
      }

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
          date: effectiveDateISO ? effectiveDateISO.split('T')[0] : new Date().toISOString().split('T')[0],
          subtotal: amount,
          vat_amount: 0,
          total_amount: amount,
          payment_method: service.financials?.payment_method || 'cash',
        };
        if (effectiveDateISO) {
          invoicePayload.created_at = effectiveDateISO;
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
    const moduleKey = mapCategoryToModule(data.category);
    await requirePermission(moduleKey, 'edit');

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const updatePayload: any = {
      category: data.category,
      status: data.status,
      details: data.details,
      financials: data.financials,
    };

    if (data.referenceId !== undefined) {
      updatePayload.reference_id = data.referenceId ? String(data.referenceId).trim() : null;
    }

    const { data: updated, error } = await supabase
      .from('customer_services')
      .update(updatePayload)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
    revalidatePath('/dashboard/tour-packages');
    revalidatePath('/dashboard/custom-service');
    revalidatePath('/dashboard');

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

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
    revalidatePath('/dashboard/tour-packages');
    revalidatePath('/dashboard/custom-service');
    revalidatePath('/dashboard');
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

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
    revalidatePath('/dashboard/tour-packages');
    revalidatePath('/dashboard/custom-service');
    revalidatePath('/dashboard');

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
      updateData.details = {
        ...(existing.details as any || {}),
        ...payload.details,
      };
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

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
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

      revalidatePath('/dashboard/uae-visa');
      revalidatePath('/dashboard/customers');
      revalidatePath('/dashboard/air-tickets');
      revalidatePath('/dashboard/other-visa');
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


