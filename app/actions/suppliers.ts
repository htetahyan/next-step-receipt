'use server';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Fetch all suppliers
export async function getSuppliers() {
  try {
    const data = await db
      .select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt));
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to get suppliers:', err);
    return { success: false, error: err.message, data: [] };
  }
}

// Add a new supplier
export async function addSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  services?: any[];
}) {
  try {
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        services: data.services || [],
      })
      .returning();

    revalidatePath('/dashboard/suppliers');
    return { success: true, data: newSupplier };
  } catch (err: any) {
    console.error('Failed to add supplier:', err);
    return { success: false, error: err.message };
  }
}

// Update an existing supplier
export async function updateSupplier(
  id: string,
  data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    services?: any[];
  }
) {
  try {
    const [updated] = await db
      .update(suppliers)
      .set({
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        services: data.services || [],
      })
      .where(eq(suppliers.id, id))
      .returning();

    revalidatePath('/dashboard/suppliers');
    return { success: true, data: updated };
  } catch (err: any) {
    console.error('Failed to update supplier:', err);
    return { success: false, error: err.message };
  }
}

// Delete a supplier
export async function deleteSupplier(id: string) {
  try {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    revalidatePath('/dashboard/suppliers');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete supplier:', err);
    return { success: false, error: err.message };
  }
}
