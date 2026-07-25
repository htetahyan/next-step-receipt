'use client';

import React, { useState } from 'react';
import { Plus, UploadCloud, Loader2 } from 'lucide-react';
import { getPresignedUrl } from '@/app/actions/r2';
import { addDocument } from '@/app/actions/documents';
import { toast } from 'sonner';

interface DocumentUploadZoneProps {
  customerId: string;
  serviceId?: string;
  onUploadSuccess: () => void;
}

export default function DocumentUploadZone({ customerId, serviceId, onUploadSuccess }: DocumentUploadZoneProps) {
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title.trim()) {
      toast.error('Please enter a document title before uploading');
      return;
    }

    setIsUploading(true);
    try {
      const presignedRes = await getPresignedUrl(file.name, file.type);
      if (presignedRes.success && presignedRes.uploadUrl) {
        const uploadRes = await fetch(presignedRes.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (uploadRes.ok) {
          const r = await addDocument({
            customerId,
            serviceId,
            title: title.trim(),
            file_url: presignedRes.publicUrl!,
            file_key: presignedRes.fileKey!,
          });

          if (!r.error) {
            setTitle('');
            onUploadSuccess();
            toast.success('Document uploaded successfully');
          } else {
            toast.error(r.error);
          }
        } else {
          toast.error('Failed to upload file to storage');
        }
      } else {
        toast.error(presignedRes.error || 'Failed to get presigned upload URL');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading document');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
        <Plus className="h-4 w-4 text-[#D97757]" /> Upload New Document
      </h4>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase mb-1 opacity-70">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Passport Scan, Visa Copy..."
            className="input-anthropic w-full px-3 py-2 text-sm block"
          />
        </div>

        {!title.trim() ? (
          <div className="text-xs text-center p-4 rounded-lg bg-[var(--background)] font-medium border border-dashed border-[var(--card-border)] opacity-70">
            Please enter a document title before uploading
          </div>
        ) : (
          <div>
            <div className="border border-dashed border-[var(--card-border)] rounded-md p-6 text-center hover:bg-[var(--sidebar-bg)] transition-colors relative">
              <input
                type="file"
                id="doc-modal-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <UploadCloud className="w-8 h-8 opacity-40" />
                <span className="text-sm font-medium text-[#D97757]">Click or drag file to this area to upload</span>
                <span className="text-xs opacity-50">Upload a single file</span>
              </div>
            </div>
            {isUploading && (
              <div className="mt-3 text-xs font-semibold text-[#D97757] flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading to storage...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
