'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, Plus, X, Loader2, CheckCircle2, Image as ImageIcon, FileText, Clipboard, Tag } from 'lucide-react';
import { getPresignedUrl } from '@/app/actions/r2';
import { addDocument } from '@/app/actions/documents';
import { toast } from 'sonner';

interface StagedFile {
  id: string;
  file: File;
  title: string;
  tag: string;
  previewUrl?: string;
  isImage: boolean;
  sizeFormatted: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

interface DocumentUploadZoneProps {
  customerId: string;
  serviceId?: string;
  onUploadSuccess: () => void;
}

const DOCUMENT_TAGS = ['General', 'Passport', 'Visa', 'Photo', 'Emirates ID', 'Ticket', 'Insurance', 'Hotel Voucher'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanFilenameToTitle(name: string): string {
  const withoutExt = name.replace(/\.[^/.]+$/, '');
  return withoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || 'Document';
}

export default function DocumentUploadZone({ customerId, serviceId, onUploadSuccess }: DocumentUploadZoneProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Helper to add files to staging
  const addFilesToStage = useCallback((files: FileList | File[]) => {
    const newItems: StagedFile[] = [];

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;
      const title = cleanFilenameToTitle(file.name || 'Pasted Image');
      
      // Auto tag heuristic
      let tag = 'General';
      const lower = file.name.toLowerCase();
      if (lower.includes('passport')) tag = 'Passport';
      else if (lower.includes('visa')) tag = 'Visa';
      else if (lower.includes('photo') || lower.includes('pic')) tag = 'Photo';
      else if (lower.includes('id') || lower.includes('eid') || lower.includes('emirates')) tag = 'Emirates ID';
      else if (lower.includes('ticket')) tag = 'Ticket';

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        file,
        title,
        tag,
        previewUrl,
        isImage: isImg,
        sizeFormatted: formatFileSize(file.size),
        status: 'idle',
      });
    });

    if (newItems.length > 0) {
      setStagedFiles(prev => [...prev, ...newItems]);
      toast.info(`Added ${newItems.length} file${newItems.length > 1 ? 's' : ''} to upload queue`);
    }
  }, []);

  // Global & Dropzone Clipboard Paste Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // Give pasted screenshot an identifiable filename if empty
            const fileName = file.name && file.name !== 'image.png' 
              ? file.name 
              : `Pasted Screenshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.png`;
            
            const namedFile = new File([file], fileName, { type: file.type });
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFilesToStage(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFilesToStage]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropzoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToStage(e.dataTransfer.files);
    }
  };

  // Remove single item from stage
  const removeStagedFile = (id: string) => {
    setStagedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  // Update item in stage
  const updateStagedFile = (id: string, field: 'title' | 'tag', value: string) => {
    setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Upload single file
  const uploadSingle = async (item: StagedFile): Promise<boolean> => {
    try {
      const presignedRes = await getPresignedUrl(item.file.name, item.file.type);
      if (!presignedRes.success || !presignedRes.uploadUrl) {
        throw new Error(presignedRes.error || 'Failed to get upload URL');
      }

      const uploadRes = await fetch(presignedRes.uploadUrl, {
        method: 'PUT',
        body: item.file,
        headers: { 'Content-Type': item.file.type },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      const finalTitle = item.title.trim() || cleanFilenameToTitle(item.file.name);

      const r = await addDocument({
        customerId,
        serviceId,
        title: finalTitle,
        file_url: presignedRes.publicUrl!,
        file_key: presignedRes.fileKey!,
        tag: item.tag || 'General',
      });

      if (r.error) throw new Error(r.error);

      return true;
    } catch (err: any) {
      console.error('Upload error for', item.title, err);
      return false;
    }
  };

  // Batch upload all staged files
  const handleUploadAll = async () => {
    if (stagedFiles.length === 0 || isUploadingAll) return;

    setIsUploadingAll(true);
    let successCount = 0;

    for (const item of stagedFiles) {
      setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      const ok = await uploadSingle(item);
      if (ok) {
        successCount++;
        setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success' } : f));
      } else {
        setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: 'Failed' } : f));
      }
    }

    setIsUploadingAll(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}`);
      onUploadSuccess();
      // Remove successfully uploaded files after short delay
      setTimeout(() => {
        setStagedFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 1000);
    } else {
      toast.error('Failed to upload selected files');
    }
  };

  return (
    <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-[#D97757]" />
          Upload Customer Documents
        </h4>
        <div className="flex items-center gap-2 text-xs opacity-60">
          <span className="hidden sm:inline">Select, drag & drop, or</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--card-border)] text-[var(--foreground)]">
            <Clipboard className="w-3 h-3" /> Ctrl+V Paste
          </span>
        </div>
      </div>

      {/* Dropzone Area */}
      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 relative ${
          isDragging
            ? 'border-[#D97757] bg-[#D97757]/10 scale-[0.99]'
            : 'border-[var(--card-border)] hover:border-[#D97757]/60 hover:bg-[var(--card-border)]/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFilesToStage(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[#D97757]/10 text-[#D97757] flex items-center justify-center transition-transform group-hover:scale-110">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {isDragging ? 'Drop files to add' : 'Click or Drag & Drop multiple files here'}
            </p>
            <p className="text-xs opacity-50 mt-0.5">
              Supports Images (JPG, PNG, WebP), PDFs & Documents • Multiple select & Paste supported
            </p>
          </div>
        </div>
      </div>

      {/* Staging Queue Gallery with Live Previews */}
      {stagedFiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Ready to Upload ({stagedFiles.length})
            </span>
            <button
              onClick={() => setStagedFiles([])}
              disabled={isUploadingAll}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
            {stagedFiles.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border flex items-center gap-3 bg-[var(--background)] transition-all ${
                  item.status === 'success'
                    ? 'border-green-500/40 bg-green-500/5'
                    : item.status === 'error'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-[var(--card-border)]'
                }`}
              >
                {/* Image Thumbnail Preview or Icon */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/10 shrink-0 border border-[var(--card-border)] flex items-center justify-center">
                  {item.isImage && item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-6 h-6 opacity-60 text-[#D97757]" />
                  )}
                </div>

                {/* Info & Editable Fields */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={item.title}
                    disabled={isUploadingAll}
                    onChange={(e) => updateStagedFile(item.id, 'title', e.target.value)}
                    placeholder="Document Title (optional)"
                    className="w-full text-xs font-semibold bg-transparent border-b border-transparent focus:border-[#D97757] outline-none truncate"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={item.tag}
                      disabled={isUploadingAll}
                      onChange={(e) => updateStagedFile(item.id, 'tag', e.target.value)}
                      className="text-[10px] font-medium py-0.5 px-1.5 rounded bg-[var(--card-border)]/50 border border-[var(--card-border)] outline-none"
                    >
                      {DOCUMENT_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-[10px] opacity-40 font-mono">{item.sizeFormatted}</span>
                  </div>
                </div>

                {/* Status / Remove Action */}
                <div className="shrink-0">
                  {item.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D97757]" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {item.status === 'idle' && (
                    <button
                      onClick={() => removeStagedFile(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Remove from queue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUploadAll}
            disabled={isUploadingAll || stagedFiles.length === 0}
            className="w-full py-2.5 px-4 bg-[#D97757] hover:bg-[#c26243] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploadingAll ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading Documents...</>
            ) : (
              <><UploadCloud className="w-4 h-4" /> Upload {stagedFiles.length} Document{stagedFiles.length > 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
