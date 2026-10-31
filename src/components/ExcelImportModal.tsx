import React, { useState, useRef, useMemo, DragEvent } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Check,
  UploadCloud,
  FileText,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCheck,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Layers,
  ShieldAlert,
  ClipboardPaste,
  Sparkles,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, AppUser } from '../types';
import {
  parseAlManhalWorkbook,
  parseAlManhalFromText,
  ParseResult,
  AlManhalFieldKey,
} from '../utils/almanhalParser';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newStudents: Student[]) => Promise<boolean | void> | void;
  currentUser?: AppUser;
  onDeleteBatch?: (batchId: string) => Promise<void>;
  onOpenManageModal?: () => void;
}

// Sample official data matching UAE Ministry of Education export format
const SAMPLE_MINISTRY_PASTE_DATA = `رقم الطالب\tالاسم بالعربية\tالاسم بالانجليزية\tالرقم الوطني\tالجنس\tالجنسية \tحالة المواطنة\tتاريخ الميلاد  \tمكان الميلاد\tالعمر حتى تاريخه\t\tالبلد\tالإمارة\tالمدينة\t\tمنطقة/قطاع\tحوض/حي\tاسم الشارع\tخط العرض\tخط الطول\tمن أصحاب الهمم\tنوع المواصلات\tالبريد\tرقم الهاتف\tالديانة\tالشعبة\tالمسار\tالصف الدراسي\tنوع الالتحاق\tتاريخ الالتحاق \tحالة الوالدين
2016001800\tسلطان علي سليمان بن هلال النقبي\tSULTAN ALI SULAIMAN BIN HILAL ALNAQBI\t784201208260469\tذكر\tالإمارات العربية المتحدة\tمواطني دولة الامارات العربية المتحدة\t2012-11-17\tخورفكان\t13\t\tالإمارات العربية المتحدة\tالشارقة\tKHOR FAKKAN\t\tALOAWAYEN SUBURB\tHAY AL HARAY RESIDENTIAL\tnull\t25.3920095\t 56.3261211\tلا\tنعم\tstuM2016001800@moe.sch.ae\t0505113161;0503688896\tمسلم\t2\tمتقدم\tالصف التاسع\tمنقول من مدرسة عامة داخل الدولة\t2026-08-17\tنعم
2016021069\tمحمد ابراهيم محمد سيف\tMOHAMED IBRAHIM MOHAMED SAIF\t784201213617083\tذكر\tالإمارات العربية المتحدة\tمواطني دولة الامارات العربية المتحدة\t2012-03-18\tالإمارات العربية المتحدة - الفجيرة - الفجيرة\t14\t\tالإمارات العربية المتحدة\tالشارقة\tKHOR FAKKAN\t\tSAIH  ALKHOR SUBURB\tAL BARDI 4\tnull\t25.3441845\t56.3469860\tلا\tلا\tstum2016021069@moe.sch.ae\t0506809616\tمسلم\t2\tمتقدم\tالصف التاسع\tمنقول من مدرسة عامة داخل الدولة\t2026-08-17\tنعم`;

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentUser,
  onOpenManageModal,
}) => {
  // Wizard steps: 1 = upload/paste, 2 = column-mapping, 3 = preview-and-confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Input mode: 'file' | 'paste'
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState<string>('');

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parser state
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [customColumnOverrides, setCustomColumnOverrides] = useState<Partial<Record<AlManhalFieldKey, number>>>({});
  const [showInvalidRowsList, setShowInvalidRowsList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state
  const handleReset = () => {
    setCurrentStep(1);
    setInputMode('file');
    setPastedText('');
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setFileBuffer(null);
    setParseResult(null);
    setSelectedSheet('');
    setCustomColumnOverrides({});
    setErrorMessage(null);
    setIsProcessing(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Run parser on buffer with current sheet and overrides
  const executeParsingBuffer = (
    buffer: ArrayBuffer,
    sheetName?: string,
    overrides?: Partial<Record<AlManhalFieldKey, number>>
  ) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const result = parseAlManhalWorkbook(buffer, {
        forcedSheetName: sheetName,
        currentUserSchoolId: currentUser?.schoolId,
        customColumnIndices: overrides,
      });

      setParseResult(result);
      setSelectedSheet(result.selectedSheetName);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Excel parsing error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة ملف الإكسل.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run parser on pasted text (TSV or CSV)
  const executeParsingText = (
    text: string,
    overrides?: Partial<Record<AlManhalFieldKey, number>>
  ) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const result = parseAlManhalFromText(text, {
        currentUserSchoolId: currentUser?.schoolId,
        customColumnIndices: overrides,
      });

      setParseResult(result);
      setSelectedSheet(result.selectedSheetName);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Text parsing error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة النص المنسوخ.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process selected file from device
  const processDeviceFile = async (file: File) => {
    setErrorMessage(null);
    setSelectedFileName(file.name);
    setSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');
    setCustomColumnOverrides({});

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      executeParsingBuffer(buffer);
    } catch (err: any) {
      console.error('Error reading file buffer:', err);
      setErrorMessage('تعذر قراءة محتوى الملف من الجهاز.');
      setIsProcessing(false);
    }
  };

  // Process pasted text button handler
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('يرجى لصق بيانات الطلبة في المربع أولاً.');
      return;
    }
    setCustomColumnOverrides({});
    executeParsingText(pastedText);
  };

  // Sheet switch
  const handleSheetChange = (newSheet: string) => {
    if (!fileBuffer || newSheet === selectedSheet) return;
    setSelectedSheet(newSheet);
    setCustomColumnOverrides({});
    executeParsingBuffer(fileBuffer, newSheet, {});
  };

  // Custom column mapping override by user in Step 2
  const handleColumnOverrideChange = (fieldKey: AlManhalFieldKey, newIndex: number) => {
    const updated = { ...customColumnOverrides, [fieldKey]: newIndex };
    setCustomColumnOverrides(updated);
    if (fileBuffer) {
      executeParsingBuffer(fileBuffer, selectedSheet, updated);
    } else if (pastedText) {
      executeParsingText(pastedText, updated);
    }
  };

  // File picker handlers
  const handleOpenDevicePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processDeviceFile(files[0]);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        processDeviceFile(file);
      } else {
        setErrorMessage('يرجى اختيار ملف Excel بصيغة (.xlsx أو .xls) أو ملف (.csv)');
      }
    }
  };

  // Check if essential fields are properly mapped (studentId and nameAr)
  const essentialFieldsMapped = (() => {
    if (!parseResult) return false;
    const essentialKeys: AlManhalFieldKey[] = ['studentId', 'nameAr'];
    return essentialKeys.every((k) => {
      const mapping = parseResult.mappingStatuses.find((m) => m.fieldKey === k);
      return mapping && mapping.excelColumnIndex >= 0;
    });
  })();

  // Available raw columns for manual matching dropdown
  const availableColumnsList = (() => {
    if (!parseResult) return [];
    if (parseResult.rawHeaders && parseResult.rawHeaders.length > 0) {
      return parseResult.rawHeaders.map((name, idx) => ({ index: idx, name }));
    }
    return parseResult.mappingStatuses
      .filter((m) => m.excelColumnIndex >= 0)
      .map((m) => ({ index: m.excelColumnIndex, name: m.excelColumnName }));
  })();

  // Final Import Confirmation
  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validStudents.length === 0) {
      setErrorMessage('لا توجد سجلات صالحة للاستيراد.');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMessage(null);
      await onImport(parseResult.validStudents);
      handleClose();
    } catch (err: any) {
      console.error('Import execution error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ بيانات الطلاب.');
    } finally {
      setIsImporting(false);
    }
  };

  // Download official 29-column Al Manhal / Ministry template Excel file
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'رقم الطالب': '2016001800',
        'الاسم بالعربية': 'سلطان علي سليمان بن هلال النقبي',
        'الاسم بالانجليزية': 'SULTAN ALI SULAIMAN BIN HILAL ALNAQBI',
        'الرقم الوطني': '784201208260469',
        'الجنس': 'ذكر',
        'الجنسية': 'الإمارات العربية المتحدة',
        'حالة المواطنة': 'مواطني دولة الامارات العربية المتحدة',
        'تاريخ الميلاد': '2012-11-17',
        'مكان الميلاد': 'خورفكان',
        'العمر حتى تاريخه': '13',
        'البلد': 'الإمارات العربية المتحدة',
        'الإمارة': 'الشارقة',
        'المدينة': 'KHOR FAKKAN',
        'منطقة/قطاع': 'ALOAWAYEN SUBURB',
        'حوض/حي': 'HAY AL HARAY RESIDENTIAL',
        'اسم الشارع': '',
        'خط العرض': '25.3920095',
        'خط الطول': '56.3261211',
        'من أصحاب الهمم': 'لا',
        'نوع المواصلات': 'نعم',
        'البريد': 'stuM2016001800@moe.sch.ae',
        'رقم الهاتف': '0505113161;0503688896',
        'الديانة': 'مسلم',
        'الشعبة': '2',
        'المسار': 'متقدم',
        'الصف الدراسي': 'الصف التاسع',
        'نوع الالتحاق': 'منقول من مدرسة عامة داخل الدولة',
        'تاريخ الالتحاق': '2026-08-17',
        'حالة الوالدين': 'نعم',
      },
      {
        'رقم الطالب': '2016021069',
        'الاسم بالعربية': 'محمد ابراهيم محمد سيف',
        'الاسم بالانجليزية': 'MOHAMED IBRAHIM MOHAMED SAIF',
        'الرقم الوطني': '784201213617083',
        'الجنس': 'ذكر',
        'الجنسية': 'الإمارات العربية المتحدة',
        'حالة المواطنة': 'مواطني دولة الامارات العربية المتحدة',
        'تاريخ الميلاد': '2012-03-18',
        'مكان الميلاد': 'الإمارات العربية المتحدة - الفجيرة - الفجيرة',
        'العمر حتى تاريخه': '14',
        'البلد': 'الإمارات العربية المتحدة',
        'الإمارة': 'الشارقة',
        'المدينة': 'KHOR FAKKAN',
        'منطقة/قطاع': 'SAIH  ALKHOR SUBURB',
        'حوض/حي': 'AL BARDI 4',
        'اسم الشارع': '',
        'خط العرض': '25.3441845',
        'خط الطول': '56.3469860',
        'من أصحاب الهمم': 'لا',
        'نوع المواصلات': 'لا',
        'البريد': 'stum2016021069@moe.sch.ae',
        'رقم الهاتف': '0506809616',
        'الديانة': 'مسلم',
        'الشعبة': '2',
        'المسار': 'متقدم',
        'الصف الدراسي': 'الصف التاسع',
        'نوع الالتحاق': 'منقول من مدرسة عامة داخل الدولة',
        'تاريخ الالتحاق': '2026-08-17',
        'حالة الوالدين': 'نعم',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'بيانات الطلبة');
    XLSX.writeFile(wb, 'نموذج_استيراد_بيانات_الطلبة_المنهل_الرسمي.xlsx');
  };

  // Extract first 10 students for preview
  const previewTop10 = parseResult ? parseResult.validStudents.slice(0, 10) : [];

  // Section & Track breakdown of valid imported students (Grade + Track + Section)
  const sectionBreakdown = useMemo(() => {
    if (!parseResult) return [];
    const map = new Map<string, { grade: string; track: string; section: string; count: number }>();
    parseResult.validStudents.forEach((st) => {
      const g = st.grade || 'غير محدد';
      const trk = st.track || 'عام';
      const sec = st.section || 'غير محدد';
      const key = `${g}-${trk}-${sec}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { grade: g, track: trk, section: sec, count: 1 });
      }
    });
    const rankOrder: Record<string, number> = {
      'أول': 1, 'ثاني': 2, 'ثالث': 3, 'رابع': 4,
      'خامس': 5, 'سادس': 6, 'سابع': 7, 'ثامن': 8,
      'تاسع': 9, 'عاشر': 10, 'حادي عشر': 11, 'ثاني عشر': 12,
      'غير محدد': 999,
    };
    return Array.from(map.values()).sort((a, b) => {
      const rA = rankOrder[a.grade] ?? 500;
      const rB = rankOrder[b.grade] ?? 500;
      if (rA !== rB) return rA - rB;
      const gCmp = a.grade.localeCompare(b.grade, 'ar', { numeric: true });
      if (gCmp !== 0) return gCmp;
      const tCmp = a.track.localeCompare(b.track, 'ar');
      if (tCmp !== 0) return tCmp;
      return a.section.localeCompare(b.section, 'ar', { numeric: true });
    });
  }, [parseResult]);

  const needsReviewInBatch = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.validStudents.filter(
      (st) => st.track === 'يحتاج مراجعة' || st.grade === 'غير محدد' || st.hasMissingGradeOrSection
    ).length;
  }, [parseResult]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl max-w-5xl w-full my-auto flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        {/* Modal Header with Steps Indicator */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  استيراد بيانات الطلبة (نظام المنهل / وزارة التربية)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                  مطابقة ذكية لـ 29 حقلاً رسمياً
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يدعم رفع ملف Excel أو اللصق المباشر من الإكسل مع كشف آلي للعناوين والبيانات الوطنية
              </p>
            </div>
          </div>

          {/* Stepper Wizard Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 self-center sm:self-auto text-xs font-medium">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 1
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : currentStep > 1
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-black/10">1</span>
              <span>رفع / لصق البيانات</span>
            </div>

            <div className="w-3 h-0.5 bg-slate-200 dark:bg-slate-700" />

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 2
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : currentStep > 2
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-black/10">2</span>
              <span>مطابقة الحقول</span>
            </div>

            <div className="w-3 h-0.5 bg-slate-200 dark:bg-slate-700" />

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 3
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-black/10">3</span>
              <span>المعاينة والتأكيد</span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="mr-2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">تنبيه في معالجة البيانات:</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* STEP 1: FILE UPLOAD OR DIRECT TEXT PASTE */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">

              {/* Mode Toggle: File upload vs Paste from Excel */}
              <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    inputMode === 'file'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>رفع ملف إكسل (.xlsx / .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    inputMode === 'paste'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>لصق مباشر من الإكسل (Copy & Paste)</span>
                </button>
              </div>

              {/* MODE 1: File Dropzone */}
              {inputMode === 'file' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleOpenDevicePicker}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/70 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    {isProcessing ? (
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                    ) : (
                      <UploadCloud className="w-8 h-8" />
                    )}
                  </div>

                  <div>
                    <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                      اضغط لاختيار ملف Excel المنهل أو اسحبه إلى هنا
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      يدعم ملفات (.xlsx، .xls، .csv) الصادرة مباشرة من نظام المنهل أو الإكسل
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      كشف تلقائي لصف العناوين
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      مطابقة أرقام الهوية والأرقام الطلابية
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      فصل أرقام الهواتف المتعددة
                    </span>
                  </div>
                </div>
              )}

              {/* MODE 2: Direct Text Area Paste */}
              {inputMode === 'paste' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                      <span>الصق أسطر وبيانات الطلبة المنسوخة من الإكسل:</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setPastedText(SAMPLE_MINISTRY_PASTE_DATA)}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ملء بيانات نموذجية (نفس مثال الوزارة)</span>
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    dir="auto"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="قم بنسخ صفوف الطلبة من ملف الإكسل (بما فيها صف العناوين) ولصقها هنا مباشرة..."
                    className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      يمكنك نسخ صف العناوين مع أي عدد من صفوف الطلبة وسيتعرف النظام عليها آلياً
                    </span>

                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      disabled={isProcessing || !pastedText.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جارٍ تحليل البيانات...</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-4 h-4" />
                          <span>معالجة وتحليل البيانات المنسوخة</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Info Box & Download Sample Template */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      الأعمدة الرسمية المعتمدة (29 حقلاً):
                    </p>
                    <p className="mt-0.5">
                      رقم الطالب، الاسم بالعربية والإنجليزية، الرقم الوطني (الهوية)، الجنس، الجنسية، تاريخ الميلاد، الإمارة، الهاتف، الشعبة، المسار، الصف الدراسي، نوع وتاريخ الالتحاق، وحالة الوالدين.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  {onOpenManageModal && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenManageModal();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-xs font-bold text-amber-900 flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                      title="حذف الطلبة الحاليين أو تفريغ فصول محددة قبل الاستيراد"
                    >
                      <Trash2 className="w-4 h-4 text-amber-700" />
                      <span>تفريغ / إدارة السجلات</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>تحميل نموذج المنهل (A4)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: COLUMN MAPPING & WORKSHEET SELECTOR */}
          {/* ========================================================================= */}
          {currentStep === 2 && parseResult && (
            <div className="space-y-6">
              
              {/* Sheet Selector (if file had multiple sheets) */}
              {parseResult.sheetNames.length > 1 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        أوراق العمل داخل الملف ({parseResult.sheetNames.length} أوراق):
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        اختر ورقة العمل المراد استيراد بيانات الطلبة منها
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {parseResult.sheetNames.map((name) => {
                      const isSelected = name === selectedSheet;
                      const isSuggested = name === parseResult.suggestedSheetName;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSheetChange(name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{name}</span>
                          {isSuggested && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-extrabold">
                              موصى بها
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Header Row Detection Notice */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    تم اكتشاف صف عناوين الطلبة في <strong>الصف رقم ({parseResult.headerRowIndex + 1})</strong> بنجاح.
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {parseResult.validStudents.length} طالب مؤهل للاستيراد
                </span>
              </div>

              {/* Column Mapping Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    جدول مطابقة الحقول (Column Mapping):
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    تمت المطابقة التلقائية ويمكنك تعديل أي عمود يدوياً قبل التأكيد
                  </p>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-xs max-h-[360px] overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="p-3">الحقل داخل النظام</th>
                        <th className="p-3">عمود Excel المطابق</th>
                        <th className="p-3">مثال حقيقي من أول سجل</th>
                        <th className="p-3 text-center">حالة المطابقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {parseResult.mappingStatuses.map((mapping) => {
                        const isEssential = mapping.isRequired;
                        return (
                          <tr
                            key={mapping.fieldKey}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors ${
                              mapping.status === 'missing' && isEssential ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            {/* System Field Label */}
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <span>{mapping.labelAr}</span>
                                {isEssential && (
                                  <span className="px-1.5 py-0.5 rounded-sm bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                                    إلزامي
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Matched Excel Column Dropdown */}
                            <td className="p-3">
                              <select
                                value={mapping.excelColumnIndex}
                                onChange={(e) =>
                                  handleColumnOverrideChange(mapping.fieldKey, Number(e.target.value))
                                }
                                className="w-full max-w-xs text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                              >
                                <option value="-1">-- غير محدد --</option>
                                {availableColumnsList.map((col) => (
                                  <option key={col.index} value={col.index}>
                                    العمود ({col.index + 1}): {col.name || `بدون اسم`}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Sample value */}
                            <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] max-w-xs truncate">
                              {mapping.sampleValue ? (
                                <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200">
                                  {mapping.sampleValue}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">لا توجد قيمة</span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3 text-center">
                              {mapping.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{mapping.statusTextAr}</span>
                                </span>
                              ) : mapping.status === 'warning' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{mapping.statusTextAr}</span>
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                    isEssential
                                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                  }`}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>{mapping.statusTextAr}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {!essentialFieldsMapped && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    يرجى ربط حقلي (رقم الطالب) و(الاسم بالعربية) على الأقل للمتابعة إلى خطوة المعاينة.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PREVIEW & CONFIRMATION */}
          {/* ========================================================================= */}
          {currentStep === 3 && parseResult && (
            <div className="space-y-6">

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl">
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">السجلات الصالحة للاستيراد</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {parseResult.validStudents.length}
                  </p>
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">جاهزة للحفظ والتوزيع المدرسي الفوري</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">الصفوف المتجاهلة / المستبعدة</p>
                  <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
                    {parseResult.invalidRows.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">ترويسات مكررة أو صفوف فارغة</p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">معرف دفعة الاستيراد (Batch ID)</p>
                  <p className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200 mt-1.5 truncate" title={parseResult.importBatchId}>
                    {parseResult.importBatchId}
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">لإمكانية التراجع أو الحذف لاحقاً</p>
                </div>
              </div>

              {/* Detected Sections & Tracks Breakdown (Grade + Track + Section) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                    توزيع الشعب والمسارات المكتشفة بالمعيار الثلاثي (الصف + المسار + الشعبة):
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {sectionBreakdown.length} مجموعة منفصلة
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sectionBreakdown.map((secGroup) => {
                    const isAdv = secGroup.track === 'متقدم';
                    const isReview = secGroup.track === 'يحتاج مراجعة';
                    return (
                      <span
                        key={`${secGroup.grade}-${secGroup.track}-${secGroup.section}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                          isAdv
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : isReview
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                        }`}
                      >
                        <span>
                          {secGroup.grade} — {isAdv ? '🔬 متقدم' : isReview ? '⚠️ مراجعة' : '📘 عام'} (شعبة {secGroup.section})
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-white/70 dark:bg-slate-800 text-[10px] font-mono">
                          {secGroup.count} طالب
                        </span>
                      </span>
                    );
                  })}
                </div>

                {needsReviewInBatch > 0 && (
                  <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      ملاحظة: يوجد <strong>{needsReviewInBatch}</strong> طالب بمسار غير محدد (يحتاج مراجعة) لعدم وجود مؤشر مسار صريح في الملف. سيمكنك تدقيقهم وتحديد مسارهم عبر أداة مراجعة وتصحيح المسار بعد الحفظ.
                    </span>
                  </div>
                )}
              </div>

              {/* Display first 10 students preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      معاينة تفصيلية لبيانات الطلبة المستخرجة:
                    </h4>
                    <span className="text-xs text-slate-500">
                      (أول {previewTop10.length} من إجمالي {parseResult.validStudents.length} طالب)
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-xs max-h-[380px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">رقم الطالب</th>
                        <th className="p-3">الاسم بالعربية</th>
                        <th className="p-3">الرقم الوطني (الهوية)</th>
                        <th className="p-3">الجنس</th>
                        <th className="p-3">الصف الدراسي</th>
                        <th className="p-3">الشعبة</th>
                        <th className="p-3">المسار</th>
                        <th className="p-3">رقم الهاتف</th>
                        <th className="p-3">البريد</th>
                        <th className="p-3">الجنسية / الإمارة</th>
                        <th className="p-3">تاريخ الالتحاق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 whitespace-nowrap">
                      {previewTop10.map((st, idx) => (
                        <tr key={st.studentNumber || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{st.studentNumber}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                            <div>
                              <span>{st.fullName}</span>
                              {st.nameEn && (
                                <span className="text-[10px] text-slate-400 block font-sans">{st.nameEn}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{st.nationalId || '-'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]">
                              {st.gender || 'بنين'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold text-[11px]">
                              {st.grade}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-bold text-[11px]">
                              شعبة {st.section}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{st.track}</td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {st.parentPhone ? (
                              <div>
                                <span>{st.parentPhone}</span>
                                {st.alternatePhone && (
                                  <span className="text-[10px] text-slate-400 block">بديل: {st.alternatePhone}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">غير مسجل</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500 max-w-[140px] truncate" title={st.email}>
                            {st.email || '-'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {st.nationality || st.emirate || '-'}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {st.enrollmentDate || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Details of skipped rows if any */}
              {parseResult.invalidRows.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        تم استبعاد {parseResult.invalidRows.length} صف غير صالح أو ترويسة مكررة
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInvalidRowsList(!showInvalidRowsList)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      {showInvalidRowsList ? 'إخفاء التفاصيل' : 'عرض أسباب الاستبعاد'}
                    </button>
                  </div>

                  {showInvalidRowsList && (
                    <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                      {parseResult.invalidRows.map((inv, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                        >
                          <span className="font-mono text-slate-500">صف #{inv.rowNumber}</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">{inv.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الخطوة السابقة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep === 1 ? (
              inputMode === 'file' ? (
                <button
                  type="button"
                  onClick={handleOpenDevicePicker}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ فحص الملف...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>اختيار ملف المنهل</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={isProcessing || !pastedText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ تحليل البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      <span>متابعة تحليل النص المنسوخ</span>
                    </>
                  )}
                </button>
              )
            ) : currentStep === 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!essentialFieldsMapped || !parseResult || parseResult.validStudents.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>المتابعة إلى المعاينة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || !parseResult || parseResult.validStudents.length === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ حفظ بيانات الطلاب...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>تأكيد استيراد ({parseResult?.validStudents.length}) طالب</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
