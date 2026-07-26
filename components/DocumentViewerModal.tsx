'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { downloadDocumentFile, isImageFile, isPdfFile } from '@/lib/downloadHelper';

export interface DocumentItem {
  id?: string;
  title: string;
  file_url?: string;
  fileUrl?: string;
  tag?: string;
  created_at?: string;
  createdAt?: string;
  file_key?: string;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  initialIndex?: number;
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documents = [],
  initialIndex = 0,
}: DocumentViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, documents.length - 1)));
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex, documents.length]);

  const currentDoc = documents[currentIndex] || null;
  const currentUrl = currentDoc?.file_url || currentDoc?.fileUrl || '';
  const currentTitle = currentDoc?.title || 'Document';

  const isImg = currentUrl ? isImageFile(currentUrl, currentTitle) : false;
  const isPdf = currentUrl ? isPdfFile(currentUrl, currentTitle) : false;

  // Keyboard navigation & ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && documents.length > 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && documents.length > 1) {
        handlePrev();
      } else if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || (e.ctrlKey && e.key === '-')) {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, documents.length, currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
    setZoom(1);
    setRotation(0);
  }, [documents.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [documents.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);
  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);

  const handleDownload = () => {
    if (currentUrl) {
      downloadDocumentFile(currentUrl, currentTitle);
    }
  };

  if (!isOpen || !currentDoc) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Container Box */}
      <div
        className={`relative flex flex-col bg-[var(--card-bg)] text-[var(--foreground)] transition-all duration-300 shadow-2xl overflow-hidden ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-[95vw] max-w-6xl h-[90vh] rounded-2xl border border-[var(--card-border)]'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] shrink-0 z-10">
          {/* File Info */}
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 rounded-lg bg-[#D97757]/10 text-[#D97757] shrink-0">
              {isImg ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base md:text-lg font-semibold truncate text-[var(--foreground)]">
                  {currentTitle}
                </h3>
                {currentDoc.tag && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-[#D97757]/15 text-[#D97757]">
                    {currentDoc.tag}
                  </span>
                )}
              </div>
              <p className="text-xs opacity-60 flex items-center gap-2">
                {documents.length > 1 && <span>Document {currentIndex + 1} of {documents.length}</span>}
                {currentDoc.created_at || currentDoc.createdAt ? (
                  <span>
                    • Added {new Date(currentDoc.created_at || currentDoc.createdAt!).toLocaleDateString()}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Image specific controls */}
            {isImg && (
              <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-[var(--card-border)] mr-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 disabled:opacity-30 transition-colors"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-12 text-center opacity-70">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 4}
                  className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 disabled:opacity-30 transition-colors"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotateLeft}
                  className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 transition-colors"
                  title="Rotate Left"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotateRight}
                  className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 transition-colors"
                  title="Rotate Right"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 transition-colors"
                  title="Reset View"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Direct Download Button */}
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-lg bg-[#D97757] hover:bg-[#c26243] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download File Direct"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 transition-colors hidden sm:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card-border)] opacity-80 hover:opacity-100 transition-colors ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Canvas Content Area */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-black/40 dark:bg-black/60 overflow-auto flex items-center justify-center p-4 custom-scrollbar"
        >
          {/* Previous Document Side Button */}
          {documents.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-transform hover:scale-110 shadow-lg border border-white/10"
              title="Previous Document (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Document Side Button */}
          {documents.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-transform hover:scale-110 shadow-lg border border-white/10"
              title="Next Document (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image Document Mode */}
          {isImg && (
            <div className="relative flex items-center justify-center max-w-full max-h-full transition-transform duration-200 select-none">
              <img
                src={currentUrl}
                alt={currentTitle}
                className="max-w-full max-h-[75vh] object-contain rounded shadow-2xl transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              />
            </div>
          )}

          {/* PDF Document Mode */}
          {isPdf && (
            <div className="w-full h-full flex flex-col rounded-lg overflow-hidden border border-[var(--card-border)] bg-white shadow-xl">
              <iframe
                src={`${currentUrl}#toolbar=1`}
                title={currentTitle}
                className="w-full h-full border-0 min-h-[65vh]"
              />
            </div>
          )}

          {/* Other File Type Fallback */}
          {!isImg && !isPdf && (
            <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#D97757]/10 text-[#D97757] flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold">{currentTitle}</h4>
                <p className="text-xs opacity-60 mt-1">This file format cannot be rendered in direct preview.</p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 rounded-xl bg-[#D97757] hover:bg-[#c26243] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" /> Download File Directly
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Thumbnail Bar for multiple docs */}
        {documents.length > 1 && (
          <div className="px-6 py-3 border-t border-[var(--card-border)] bg-[var(--sidebar-bg)] flex items-center justify-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
            {documents.map((doc, idx) => {
              const url = doc.file_url || doc.fileUrl || '';
              const isSelected = idx === currentIndex;
              const isImgThumb = isImageFile(url, doc.title);
              return (
                <button
                  key={doc.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                    isSelected
                      ? 'border-[#D97757] bg-[#D97757]/10 text-[#D97757] font-bold shadow-xs scale-105'
                      : 'border-[var(--card-border)] hover:bg-[var(--card-border)] opacity-70 hover:opacity-100'
                  }`}
                >
                  {isImgThumb ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  <span className="max-w-[120px] truncate">{doc.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}
