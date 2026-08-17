'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, X, Loader2, CheckCircle2, FileText, Clipboard, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { getPresignedUrl } from '@/app/actions/r2';
import { addDocument } from '@/app/actions/documents';
import { toast } from 'sonner';
import { useOnlineStatus } from './ui/OfflineBanner';
import BatchUploadConfirmModal, { UploadBatchItem } from './ui/BatchUploadConfirmModal';

interface StagedFile {
  id: string;
  file: File;
  title: string;
  tag: string;
  previewUrl?: string;
  isImage: boolean;
  sizeBytes: number;
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
  const isOnline = useOnlineStatus();
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const abortControllersRef = useRef<{ [id: string]: AbortController }>({});

  // Cleanup abort controllers and preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(c => c.abort());
    };
  }, []);

  const addFilesToStage = useCallback((files: FileList | File[]) => {
    const newItems: StagedFile[] = [];

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;
      const title = cleanFilenameToTitle(file.name || 'Pasted Image');
      
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
        sizeBytes: file.size,
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
            const fileName = file.name && file.name !== 'image.png' 
              ? file.name 
              : `Pasted Screenshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.png`;
            pastedFiles.push(new File([file], fileName, { type: file.type }));
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

  const removeStagedFile = (id: string) => {
    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
      delete abortControllersRef.current[id];
    }
    setStagedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const updateStagedFile = (id: string, field: 'title' | 'tag', value: string) => {
    setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Upload single file with AbortController and connection drop protection
  const uploadSingle = async (item: StagedFile): Promise<boolean> => {
    if (!navigator.onLine) {
      setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: 'Offline' } : f));
      return false;
    }

    const controller = new AbortController();
    abortControllersRef.current[item.id] = controller;

    try {
      const presignedRes = await getPresignedUrl(item.file.name, item.file.type);
      if (!presignedRes.success || !presignedRes.uploadUrl) {
        throw new Error(presignedRes.error || 'Failed to get upload URL');
      }

      const uploadRes = await fetch(presignedRes.uploadUrl, {
        method: 'PUT',
        body: item.file,
        headers: { 'Content-Type': item.file.type },
        signal: controller.signal,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed (${uploadRes.status})`);
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

      delete abortControllersRef.current[item.id];
      return true;
    } catch (err: any) {
      delete abortControllersRef.current[item.id];
      const isAborted = err.name === 'AbortError';
      const isConnDrop = !navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      const msg = isAborted ? 'Cancelled' : isConnDrop ? 'Connection dropped' : err.message || 'Error';
      
      setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: msg } : f));
      return false;
    }
  };

  // Check if threshold requires confirmation modal
  const handleInitiateUpload = () => {
    if (!isOnline) {
      toast.error('You are currently offline. Please reconnect to the internet.');
      return;
    }

    const totalBytes = stagedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
    const hasLargeFile = stagedFiles.some(f => f.sizeBytes > 10 * 1024 * 1024); // > 10MB
    const isLargeBatch = totalBytes > 15 * 1024 * 1024 || stagedFiles.length > 5; // > 15MB or > 5 files

    if (hasLargeFile || isLargeBatch) {
      setShowConfirmModal(true);
    } else {
      executeBatchUpload();
    }
  };

  const executeBatchUpload = async () => {
    if (stagedFiles.length === 0 || isUploadingAll) return;

    setIsUploadingAll(true);
    let successCount = 0;

    for (const item of stagedFiles) {
      if (item.status === 'success') continue;
      setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      const ok = await uploadSingle(item);
      if (ok) {
        successCount++;
        setStagedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success' } : f));
      }
    }

    setIsUploadingAll(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}`);
      onUploadSuccess();
      setTimeout(() => {
        setStagedFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 1200);
    }
  };

  const totalBytes = stagedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
  const confirmItems: UploadBatchItem[] = stagedFiles.map(f => ({
    id: f.id,
    title: f.title,
    sizeFormatted: f.sizeFormatted,
    sizeBytes: f.sizeBytes,
    isLarge: f.sizeBytes > 10 * 1024 * 1024,
    isImage: f.isImage,
    previewUrl: f.previewUrl,
  }));

  return (
    <>
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-5 space-y-4">
        {/* Offline Warning Notice */}
        {!isOnline && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>You are currently offline. Uploading is disabled until reconnected.</span>
          </div>
        )}

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
                Supports Images, PDFs & Docs • Paste screenshot directly • Optional naming
              </p>
            </div>
          </div>
        </div>

        {/* Staging Queue Gallery with Live Previews */}
        {stagedFiles.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Ready to Upload ({stagedFiles.length}) • Total: {formatFileSize(totalBytes)}
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
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/10 shrink-0 border border-[var(--card-border)] flex items-center justify-center">
                    {item.isImage && item.previewUrl ? (
                      <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-6 h-6 opacity-60 text-[#D97757]" />
                    )}
                  </div>

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
                      <span className="text-[10px] opacity-50 font-mono">{item.sizeFormatted}</span>
                      {item.errorMsg && (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 truncate">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {item.errorMsg}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {item.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#D97757]" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <button
                        onClick={() => uploadSingle(item)}
                        disabled={!isOnline || isUploadingAll}
                        className="p-1 text-[#D97757] hover:bg-[#D97757]/10 rounded transition-colors"
                        title="Retry upload"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.status !== 'uploading' && (
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

            <button
              onClick={handleInitiateUpload}
              disabled={!isOnline || isUploadingAll || stagedFiles.length === 0}
              className="w-full py-2.5 px-4 bg-[#D97757] hover:bg-[#c26243] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploadingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading Documents...</>
              ) : !isOnline ? (
                <><WifiOff className="w-4 h-4" /> Offline - Reconnect to Upload</>
              ) : (
                <><UploadCloud className="w-4 h-4" /> Upload {stagedFiles.length} Document{stagedFiles.length > 1 ? 's' : ''} ({formatFileSize(totalBytes)})</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Large / Multi-File Confirmation Modal */}
      <BatchUploadConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeBatchUpload}
        items={confirmItems}
        totalSizeBytes={totalBytes}
        totalSizeFormatted={formatFileSize(totalBytes)}
      />
    </>
  );
}
