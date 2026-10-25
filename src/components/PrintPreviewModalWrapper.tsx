import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PrintPreviewModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onPrint?: () => void;
  printButtonId?: string;
  printButtonText?: string;
  children: React.ReactNode;
  defaultZoom?: number;
  extraToolbarContent?: React.ReactNode;
}

export const PrintPreviewModalWrapper: React.FC<PrintPreviewModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  onPrint,
  printButtonId = 'btn-modal-print-action',
  printButtonText = 'طباعة النموذج (A4) / حفظ PDF',
  children,
  defaultZoom = 80,
  extraToolbarContent,
}) => {
  const [zoom, setZoom] = useState<number>(defaultZoom);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Reset zoom to default when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(defaultZoom);
      setIsPrinting(false);
    }
  }, [isOpen, defaultZoom]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Manage print classes on document.body, lock scroll, and listen to print events
  useEffect(() => {
    if (!isOpen) return;

    // Apply isolation classes to document.body
    document.body.classList.add('print-form-active', 'print-modal-open');
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Intercept browser print triggers (e.g. Ctrl+P while preview is open)
    let savedDocTitle = '';
    const handleBeforePrint = () => {
      setIsPrinting(true);
      savedDocTitle = document.title;
      document.title = '';
    };

    const handleAfterPrint = () => {
      setIsPrinting(false);
      if (savedDocTitle) {
        document.title = savedDocTitle;
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.body.classList.remove('print-form-active', 'print-modal-open');
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      if (savedDocTitle) {
        document.title = savedDocTitle;
      }
    };
  }, [isOpen]);

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    const originalTitle = document.title;
    document.title = '';
    // Allow DOM to apply unscaled 100% dimensions before browser opens print dialog
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (onPrint) {
          onPrint();
        } else {
          window.print();
        }
        setTimeout(() => {
          document.title = originalTitle;
          setIsPrinting(false);
        }, 500);
      }, 60);
    });
  }, [onPrint]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      id="print-preview-modal-root"
      data-print-modal="true"
      className="print-modal-portal fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150 print:p-0 print:m-0 print:static print:bg-white print:overflow-visible print:block print:inset-auto text-slate-900 dark:text-slate-100"
      dir="rtl"
    >
      {/* Pinned Sticky Toolbar (Never scrolls away) */}
      <div className="shrink-0 bg-[#0C2340] text-white border-b-2 border-[#D4AF37] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg no-print z-50">
        {/* Right side: Emblem and title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#006D77] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-xs">
            <Printer className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-xs sm:text-sm text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-300 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center: Zoom and Scale Controls (تصغير المعاينة لتناسب الشاشة) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-xl shadow-inner text-xs">
          <span className="text-[11px] text-slate-300 font-medium ml-1 hidden md:inline">
            حجم المعاينة:
          </span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="تصغير المعاينة (-10%)"
            aria-label="تصغير المعاينة"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <span className="text-xs font-bold font-mono text-[#D4AF37] min-w-[42px] text-center px-1">
            {zoom}%
          </span>

          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(125, prev + 10))}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="تكبير المعاينة (+10%)"
            aria-label="تكبير المعاينة"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Quick presets */}
          <button
            type="button"
            onClick={() => setZoom(75)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer hidden sm:inline-block ${
              zoom === 75
                ? 'bg-[#006D77] text-white shadow-2xs ring-1 ring-[#D4AF37]'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="ملاءمة الشاشة (75%)"
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => setZoom(85)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer hidden sm:inline-block ${
              zoom === 85
                ? 'bg-[#006D77] text-white shadow-2xs ring-1 ring-[#D4AF37]'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="حجم متوازن (85%)"
          >
            85%
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer hidden sm:inline-block ${
              zoom === 100
                ? 'bg-[#006D77] text-white shadow-2xs ring-1 ring-[#D4AF37]'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="الحجم الأصلي الكامل (100%)"
          >
            100%
          </button>

          <button
            type="button"
            onClick={() => setZoom(defaultZoom)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="إعادة ضبط حجم المعاينة الافتراضي"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Left side: Action Controls (Print button + Prominent Close button) */}
        <div className="flex items-center gap-2 flex-wrap">
          {extraToolbarContent}

          {/* Print button */}
          <button
            type="button"
            id={printButtonId}
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer border border-teal-400/30"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span className="hidden sm:inline">{printButtonText}</span>
            <span className="sm:hidden">طباعة / PDF</span>
          </button>

          {/* Prominent High-Contrast Close Button (علامة إغلاق المعاينة واضحة وبارزة دائماً) */}
          <button
            type="button"
            id="btn-close-print-preview"
            onClick={onClose}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer border border-rose-400/50 ring-1 ring-white/20"
            title="إغلاق المعاينة والعودة للشاشة السابقة (Esc)"
            aria-label="إغلاق المعاينة"
          >
            <X className="w-4 h-4" />
            <span className="inline">إغلاق المعاينة</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Viewport */}
      <div
        className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-6 flex justify-center items-start print:p-0 print:overflow-visible print:block print:m-0 print:bg-white"
        onClick={(e) => {
          // Clicking backdrop outside the document sheet closes preview
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="print-unscaled-container origin-top transition-transform duration-100 ease-out print:transform-none print:m-0 print:w-full print:max-w-none my-2"
          style={
            isPrinting
              ? { transform: 'none', margin: 0, padding: 0 }
              : {
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  marginBottom: zoom < 100 ? `${((zoom / 100) - 1) * 850}px` : '16px',
                }
          }
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden w-[820px] max-w-[95vw] print:border-none print:shadow-none print:my-0 print:max-w-none print:w-full print:rounded-none print:overflow-visible print:bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
