import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Search,
  Check,
  RotateCcw,
  X,
  Pencil,
  Sparkles,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Info,
} from 'lucide-react';
import {
  useCustomLabels,
  DEFAULT_LABELS_REGISTRY,
  CATEGORY_NAMES_AR,
  LabelDefinition,
} from '../context/CustomLabelsContext';

export const LabelCustomizerModal: React.FC = () => {
  const {
    isCustomizerOpen,
    closeCustomizer,
    customLabels,
    updateLabel,
    updateMultipleLabels,
    resetLabel,
    resetAllLabels,
    isLiveEditMode,
    toggleLiveEditMode,
    activeCategoryFilter,
    setActiveCategoryFilter,
  } = useCustomLabels();

  const [searchQuery, setSearchQuery] = useState('');
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize draft overrides with customLabels whenever modal opens
  React.useEffect(() => {
    if (isCustomizerOpen) {
      setDraftOverrides({ ...customLabels });
      setSaveSuccessMsg(null);
    }
  }, [isCustomizerOpen, customLabels]);

  const customizedCount = useMemo(() => {
    return Object.keys(customLabels).length;
  }, [customLabels]);

  const filteredLabels = useMemo(() => {
    return DEFAULT_LABELS_REGISTRY.filter((def) => {
      // Category filter
      if (activeCategoryFilter !== 'all' && def.category !== activeCategoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const customVal = (draftOverrides[def.key] ?? customLabels[def.key] ?? '').toLowerCase();
        return (
          def.key.toLowerCase().includes(query) ||
          def.defaultText.toLowerCase().includes(query) ||
          def.descriptionAr.toLowerCase().includes(query) ||
          customVal.includes(query)
        );
      }
      return true;
    });
  }, [activeCategoryFilter, searchQuery, draftOverrides, customLabels]);

  const handleInputChange = (key: string, value: string) => {
    setDraftOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSingle = async (key: string) => {
    const value = draftOverrides[key] ?? '';
    await updateLabel(key, value);
    setSaveSuccessMsg(`تم حفظ مسمى: ${key}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleResetSingle = async (key: string) => {
    await resetLabel(key);
    setDraftOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSaveSuccessMsg(`تمت استعادة المسمى الافتراضي`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleSaveAll = async () => {
    await updateMultipleLabels(draftOverrides);
    setSaveSuccessMsg('تم حفظ جميع التعديلات بنجاح');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetAllConfirm = async () => {
    if (
      window.confirm(
        'هل أنت متأكد من رغبتك في استعادة جميع المسميات الأصلية الافتراضية للنظام؟ سيتم إلغاء كافة التخصيصات.'
      )
    ) {
      await resetAllLabels();
      setDraftOverrides({});
      setSaveSuccessMsg('تمت استعادة كافة المسميات الافتراضية بنجاح');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customLabels, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `school_custom_labels_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('تعذر تصدير ملف الإعدادات');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object' && parsed !== null) {
          await updateMultipleLabels(parsed);
          setDraftOverrides((prev) => ({ ...prev, ...parsed }));
          setSaveSuccessMsg('تم استيراد المسميات بنجاح');
          setTimeout(() => setSaveSuccessMsg(null), 3000);
        }
      } catch (err) {
        alert('الملف غير صالح، يرجى اختيار ملف JSON صالح للمسميات.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isCustomizerOpen) return null;

  const categories: Array<LabelDefinition['category'] | 'all'> = [
    'all',
    'nav',
    'header',
    'dashboard',
    'students',
    'tardiness',
    'violations',
    'forms',
    'cases_intake',
    'committee_reports_users',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="bg-white dark:bg-[#0f1b2b] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white overflow-hidden ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#07172b] via-[#0C2340] to-[#122e50] text-white border-b border-[#D4AF37]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#006D77] to-[#0C2340] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  محرر المسميات وتخصيص نصوص النظام
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  {customizedCount > 0 ? `${customizedCount} مسمى مخصص` : 'القيم الافتراضية'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                تعديل أي مسمى أو عنوان أو ترويسة في التبويبات والصفحات والبطاقات مع الحفظ التلقائي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live in-place edit toggle */}
            <button
              type="button"
              onClick={toggleLiveEditMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isLiveEditMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
              }`}
              title="تفعيل التحرير المباشر بالنقر على أي نص في صفحات النظام"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isLiveEditMode ? 'وضع التحرير المباشر (نشط)' : 'تفعيل التحرير بالصفحات'}</span>
            </button>

            <button
              type="button"
              onClick={closeCustomizer}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Feedback Sub-bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-[#006D77]" />
            <span>
              يمكنك كتابة مسمى جديد لأي عنصر أو تركه فارغاً للاحتفاظ بالمسمى الوزاري الافتراضي.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessMsg && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تصدير نسخة احتياطية من المسميات المخصصة"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصدير</span>
            </button>

            <label className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">استيراد</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            {customizedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllConfirm}
                className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الكل</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3.5 py-1 rounded-lg bg-[#006D77] hover:bg-[#005a63] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="px-6 py-3 bg-white dark:bg-[#0f1b2b] border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المسميات أو التبويبات..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006D77]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills Slider */}
          <div className="w-full overflow-x-auto flex items-center gap-1.5 scrollbar-thin pb-1">
            {categories.map((cat) => {
              const isActive = activeCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#006D77] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {CATEGORY_NAMES_AR[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {filteredLabels.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold">لا توجد مسميات مطابقة لبحثك</p>
              <p className="text-xs text-slate-500 mt-1">جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً</p>
            </div>
          ) : (
            filteredLabels.map((def) => {
              const customVal = draftOverrides[def.key] ?? customLabels[def.key] ?? '';
              const hasCustom = customVal.trim() !== '' && customVal.trim() !== def.defaultText;
              const isDirty = customVal !== (customLabels[def.key] ?? '');

              return (
                <div
                  key={def.key}
                  className={`p-4 rounded-2xl border transition-all ${
                    hasCustom
                      ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-300/70 dark:border-amber-700/50'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Label meta & default */}
                    <div className="space-y-1 md:w-1/2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {def.descriptionAr}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700">
                          {def.key}
                        </span>
                        {hasCustom && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-400/40">
                            مخصص
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>المسمى الافتراضي:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                          {def.defaultText}
                        </span>
                      </div>
                    </div>

                    {/* Custom Input & Action buttons */}
                    <div className="flex items-center gap-2 md:w-1/2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={customVal}
                          onChange={(e) => handleInputChange(def.key, e.target.value)}
                          placeholder={def.defaultText}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006D77]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveSingle(def.key)}
                        disabled={!isDirty}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isDirty
                            ? 'bg-[#006D77] hover:bg-[#005a63] text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                        title="حفظ هذا المسمى"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">حفظ</span>
                      </button>

                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetSingle(def.key)}
                          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                          title="استعادة المسمى الافتراضي"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span>إجمالي المسميات القابلة للتخصيص: {DEFAULT_LABELS_REGISTRY.length}</span>
            <span>•</span>
            <span className="text-[#006D77] font-bold">{customizedCount} مسمى معدّل</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeCustomizer}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSaveAll();
                closeCustomizer();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#006D77] to-[#0b545c] hover:from-[#005a63] hover:to-[#084248] text-white font-black shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ التعديلات وإغلاق</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
