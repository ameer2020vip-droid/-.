import React, { useState, useEffect } from 'react';
import {
  X,
  School,
  Save,
  RotateCcw,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  Hash,
  Sparkles,
} from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { SchoolSettings } from '../types';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

const EMIRATES_LIST = [
  'أبوظبي',
  'دبي',
  'الشارقة',
  'عجمان',
  'أم القيوين',
  'رأس الخيمة',
  'الفجيرة',
];

const CYCLES_LIST = [
  'الحلقة الأولى (الصفوف 1 - 4)',
  'الحلقة الثانية (الصفوف 5 - 8)',
  'الحلقة الثالثة (الصفوف 9 - 12)',
  'التعليم المشترك (الحلقة 2 و 3)',
  'مجمع تعليمي شامل (الصفوف 1 - 12)',
];

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { schoolSettings, updateSchoolSettings, resetToDefaults } = useSchoolSettings();

  const [formData, setFormData] = useState<SchoolSettings>(schoolSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...schoolSettings,
      schoolName: schoolSettings.schoolName || '',
      schoolNameEn: schoolSettings.schoolNameEn || '',
      schoolNumber: schoolSettings.schoolNumber || '',
      emirate: schoolSettings.emirate || 'دبي',
      schoolCycle: schoolSettings.schoolCycle || CYCLES_LIST[0],
      schoolGender: schoolSettings.schoolGender || 'بنين',
      principalName: schoolSettings.principalName || '',
      vicePrincipalName: schoolSettings.vicePrincipalName || '',
      academicYear: schoolSettings.academicYear || '',
      currentTerm: schoolSettings.currentTerm || 'الفصل الدراسي الأول',
      phone: schoolSettings.phone || '',
      email: schoolSettings.email || '',
      address: schoolSettings.address || '',
    }));
  }, [schoolSettings, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof SchoolSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName.trim()) {
      onShowToast?.('يرجى إدخال اسم المدرسة الرسمي', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await updateSchoolSettings(formData);
      onShowToast?.('تم حفظ إعدادات وهوية المدرسة بنجاح في النظام', 'success');
      onClose();
    } catch (err: any) {
      onShowToast?.(err.message || 'حدث خطأ أثناء حفظ بيانات المدرسة', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية للقالب؟')) {
      await resetToDefaults();
      onShowToast?.('تمت استعادة الإعدادات الافتراضية', 'info');
      onClose();
    }
  };

  return (
    <div
      id="school-settings-modal"
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#0f1a2a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden text-right my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#07172b] via-[#0C2340] to-[#0a1e36] text-white p-5 sm:p-6 border-b-2 border-[#D4AF37]/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006D77] flex items-center justify-center shadow-md border border-[#D4AF37]/40 text-[#D4AF37]">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>إعدادات وهوية المدرسة</span>
                <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/40">
                  قالب المدرسة المركزي
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                تحديد اسم وبيانات المدرسة التي تنعكس تلقائياً في كامل النظام والتقارير والنماذج
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-[#006D77]" />
              <span>البيانات الأساسية للمدرسة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المدرسة الرسمي بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName || ''}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  placeholder="مثال: أكاديمية الفجيرة العلمية الإسلامية"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الأكاديمية بالإنجليزية
                </label>
                <input
                  type="text"
                  value={formData.schoolNameEn || ''}
                  onChange={(e) => handleChange('schoolNameEn', e.target.value)}
                  placeholder="e.g. Fujairah Scientific Islamic Academy"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم الوزاري للمدرسة (رقم المدرسة)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.schoolNumber || ''}
                    onChange={(e) => handleChange('schoolNumber', e.target.value)}
                    placeholder="مثال: 1001"
                    className="w-full pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                  />
                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الإمارة *
                </label>
                <select
                  value={formData.emirate || 'دبي'}
                  onChange={(e) => handleChange('emirate', e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                >
                  {EMIRATES_LIST.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المرحلة والحلقة الدراسية
                </label>
                <select
                  value={formData.schoolCycle || CYCLES_LIST[0]}
                  onChange={(e) => handleChange('schoolCycle', e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                >
                  {CYCLES_LIST.map((cy) => (
                    <option key={cy} value={cy}>
                      {cy}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع المدرسة
                </label>
                <select
                  value={formData.schoolGender || 'بنين'}
                  onChange={(e) => handleChange('schoolGender', e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                >
                  <option value="بنين">بنين</option>
                  <option value="بنات">بنات</option>
                  <option value="مشترك">مشترك (مختلط)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Leadership & Academic Period */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <UserCheck className="w-4 h-4 text-[#006D77]" />
              <span>الإدارة المدرسية والعام الدراسي</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم مدير / مديرة المدرسة *
                </label>
                <input
                  type="text"
                  required
                  value={formData.principalName || ''}
                  onChange={(e) => handleChange('principalName', e.target.value)}
                  placeholder="مثال: أ. محمد أحمد المنصوري"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم نائب المدير
                </label>
                <input
                  type="text"
                  value={formData.vicePrincipalName || ''}
                  onChange={(e) => handleChange('vicePrincipalName', e.target.value)}
                  placeholder="مثال: أ. خالد سعيد الكعبي"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  العام الدراسي
                </label>
                <input
                  type="text"
                  value={formData.academicYear || ''}
                  onChange={(e) => handleChange('academicYear', e.target.value)}
                  placeholder="مثال: 2025–2026"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفصل الدراسي الحالي
                </label>
                <select
                  value={formData.currentTerm || 'الفصل الدراسي الأول'}
                  onChange={(e) => handleChange('currentTerm', e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                >
                  <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                  <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                  <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Phone className="w-4 h-4 text-[#006D77]" />
              <span>بيانات الاتصال والعنوان (تظهر في الرسائل والكشوفات)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  هاتف المدرسة
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="04-XXXXXXX"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="school@moe.ae"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  العنوان / المنطقة
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="المدينة / المنطقة"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#006D77]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الإعدادات الافتراضية</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <span>جارٍ الحفظ...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
