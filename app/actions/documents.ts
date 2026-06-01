'use server'

import { db } from '@/db'
import { customerDocuments } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { deleteFromR2 } from './r2'

export async function addDocument(data: {
  customerId: string;
  serviceId?: string;
  title: string;
  file_url: string;
  file_key: string;
  tag?: string;
}) {
  try {
    await db.insert(customerDocuments).values({
      customerId: data.customerId,
      serviceId: data.serviceId || null,
      title: data.title,
      fileUrl: data.file_url,
      fileKey: data.file_key,
      tag: data.tag || 'General',
    });

    revalidatePath('/dashboard/customers')
    if (data.serviceId) {
      revalidatePath('/dashboard/uae-visa');
      revalidatePath('/dashboard/air-tickets');
      revalidatePath('/dashboard/other-visa');
    }
    return { success: true }
  } catch (error: any) {
    console.error('Add document error:', error)
    return { error: error.message || 'Failed to add document' }
  }
}

export async function getDocuments(customerId: string, serviceId?: string) {
  try {
    let query = db.select().from(customerDocuments).where(eq(customerDocuments.customerId, customerId));
    
    // If we pass serviceId = 'all', fetch everything for the customer.
    // If we pass a specific serviceId, fetch only docs for that service.
    // If we pass NO serviceId, we could fetch only general docs (serviceId is null), but usually we want all docs for the customer view.
    if (serviceId && serviceId !== 'all') {
       query = db.select().from(customerDocuments).where(and(eq(customerDocuments.customerId, customerId), eq(customerDocuments.serviceId, serviceId)));
    }

    const data = await query;
    // Sort descending by created_at
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { documents: data }
  } catch (error: any) {
    console.error('Fetch documents error:', error)
    return { error: error.message || 'Failed to fetch documents' }
  }
}

export async function deleteDocument(id: string, fileKey: string) {
  try {
    // 1. Delete from R2 storage
    await deleteFromR2(fileKey);

    // 2. Delete from database
    await db.delete(customerDocuments).where(eq(customerDocuments.id, id));

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/air-tickets');
    revalidatePath('/dashboard/other-visa');
    return { success: true }
  } catch (error: any) {
    console.error('Delete document error:', error)
    return { error: error.message || 'Failed to delete document' }
  }
}
