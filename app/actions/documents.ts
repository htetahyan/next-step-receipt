'use server';

import { deleteFromR2, getPresignedReadUrl } from './r2';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUserProfile, requirePermission } from './users';
import { checkPermission, ModuleKey } from '@/lib/auth-permissions';
import { revalidateAfter } from '@/lib/revalidate';

const DOC_WRITE_MODULES: ModuleKey[] = [
  'customers',
  'uae_visa',
  'air_tickets',
  'other_visa',
  'tour_packages',
  'custom_service',
];

export type DocumentInsert = {
  customerId: string;
  serviceId?: string;
  title: string;
  file_url: string;
  file_key: string;
  tag?: string;
};

async function requireDocumentWrite() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const allowed = DOC_WRITE_MODULES.some(
    (moduleKey) =>
      checkPermission(profile, moduleKey, 'create') ||
      checkPermission(profile, moduleKey, 'edit')
  );

  if (!allowed) {
    throw new Error('Forbidden: You do not have permission to attach documents.');
  }

  return profile;
}

function toRow(data: DocumentInsert) {
  return {
    customer_id: data.customerId,
    service_id: data.serviceId || null,
    title: data.title,
    file_url: data.file_url,
    file_key: data.file_key,
    tag: data.tag || 'General',
  };
}

export async function addDocuments(docs: DocumentInsert[]) {
  try {
    if (!docs.length) return { success: true };

    await requireDocumentWrite();
    const supabase = await createClient();

    const { error } = await supabase.from('customer_documents').insert(docs.map(toRow));
    if (error) throw error;

    revalidateAfter(['/dashboard/customers']);
    return { success: true };
  } catch (error: any) {
    console.error('Add documents error:', error);
    return { error: error.message || 'Failed to add documents' };
  }
}

export async function addDocument(data: DocumentInsert) {
  return addDocuments([data]);
}

export async function getDocuments(customerId: string, serviceId?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('customer_documents')
      .select('id, customer_id, service_id, title, file_url, file_key, tag, created_at')
      .eq('customer_id', customerId);

    if (serviceId && serviceId !== 'all') {
      query = query.eq('service_id', serviceId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const docs = data || [];
    const signedDocs = await Promise.all(
      docs.map(async (doc: any) => {
        const signedUrl = await getPresignedReadUrl(doc.file_key || doc.file_url);
        return {
          ...doc,
          file_url: signedUrl,
          fileUrl: signedUrl,
        };
      })
    );

    return { documents: signedDocs };
  } catch (error: any) {
    console.error('Fetch documents error:', error);
    return { error: error.message || 'Failed to fetch documents' };
  }
}

export async function deleteDocument(id: string, fileKey: string) {
  try {
    await requirePermission('customers', 'delete');
    const supabase = await createClient();

    if (fileKey) {
      await deleteFromR2(fileKey);
    }

    const { error } = await supabase.from('customer_documents').delete().eq('id', id);
    if (error) throw error;

    revalidateAfter(['/dashboard/customers']);
    return { success: true };
  } catch (error: any) {
    console.error('Delete document error:', error);
    return { error: error.message || 'Failed to delete document' };
  }
}
