'use server';

import { revalidatePath } from 'next/cache';
import { deleteFromR2 } from './r2';
import { createClient } from '@/utils/supabase/server';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore revalidation error outside request scope
  }
}

export async function addDocument(data: {
  customerId: string;
  serviceId?: string;
  title: string;
  file_url: string;
  file_key: string;
  tag?: string;
}) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('customer_documents')
      .insert({
        customer_id: data.customerId,
        service_id: data.serviceId || null,
        title: data.title,
        file_url: data.file_url,
        file_key: data.file_key,
        tag: data.tag || 'General',
      });

    if (error) throw error;

    safeRevalidate('/dashboard/customers');
    if (data.serviceId) {
      safeRevalidate('/dashboard/uae-visa');
      safeRevalidate('/dashboard/air-tickets');
      safeRevalidate('/dashboard/other-visa');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Add document error:', error);
    return { error: error.message || 'Failed to add document' };
  }
}

export async function getDocuments(customerId: string, serviceId?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customerId);
    
    if (serviceId && serviceId !== 'all') {
      query = query.eq('service_id', serviceId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return { documents: data || [] };
  } catch (error: any) {
    console.error('Fetch documents error:', error);
    return { error: error.message || 'Failed to fetch documents' };
  }
}

export async function deleteDocument(id: string, fileKey: string) {
  try {
    const supabase = await createClient();

    // 1. Delete from R2 storage if key exists
    if (fileKey) {
      await deleteFromR2(fileKey);
    }

    // 2. Delete from database
    const { error } = await supabase
      .from('customer_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    safeRevalidate('/dashboard/customers');
    safeRevalidate('/dashboard/uae-visa');
    safeRevalidate('/dashboard/air-tickets');
    safeRevalidate('/dashboard/other-visa');
    return { success: true };
  } catch (error: any) {
    console.error('Delete document error:', error);
    return { error: error.message || 'Failed to delete document' };
  }
}
