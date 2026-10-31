import React, { useState, useEffect } from 'react';
import {
  Settings,
  School,
  Clock,
  ShieldAlert,
  MessageSquare,
  FileText,
  UserCog,
  Database,
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
  Download,
  Upload,
  Info,
  ChevronLeft,
  Eye,
} from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { SchoolSettings, Student, CounselorUser, ViolationRecord } from '../types';
import { NavTab } from '../components/Navigation';
import { GmailOAuthIntegrationPanel } from '../components/GmailOAuthIntegrationPanel';
import { isAuthorizedGmailAdmin } from '../firebase/gmailNotificationService';

interface SettingsPageProps {
  currentUser?: CounselorUser | null;
  students?: Student[];
  violations?: ViolationRecord[];
  onOpenStudentProfile?: (studentId: string) => void;
  onNavigateTab?: (tab: NavTab) => void;
  onOpenUsersManagement?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type SettingsSection = 'school' | 'schedule' | 'rules' | 'messaging' | 'gmail_oauth' | 'forms' | 'users' | 'data';

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

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  students = [],
  violations = [],
  onOpenStudentProfile,
  onNavigateTab,
  onOpenUsersManagement,
  onShowToast,
}) => {
  const { schoolSettings, updateSchoolSettings, resetToDefaults } = useSchoolSettings();
  const isAdmin = isAuthorizedGmailAdmin(currentUser);

  const [activeSection, setActiveSection] = useState<SettingsSection>('school');
  const [formData, setFormData] = useState<SchoolSettings>(schoolSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<'tardiness' | 'absence' | 'summon'>('tardiness');

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
  }, [schoolSettings]);

  const handleChange = (field: keyof SchoolSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.schoolName?.trim()) {
      onShowToast('يرجى إدخال اسم المدرسة الرسمي', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateSchoolSettings(formData);
      if (success) {
        onShowToast('تم حفظ كافة إعدادات النظام ومزامنتها بنجاح', 'success');
      } else {
        onShowToast('تم الحفظ محلياً وجارٍ المزامنة السحابية', 'info');
      }
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء حفظ الإعدادات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        'تأكيد: هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية لقالب المدرسة؟ ستتم استعادة جميع القيم إلى الضبط الرسمي الموصى به.'
      )
    ) {
      try {
        await resetToDefaults();
        onShowToast('تمت استعادة الإعدادات الافتراضية للنظام بنجاح', 'info');
      } catch {
        onShowToast('تعذر استعادة الإعدادات الافتراضية', 'error');
      }
    }
  };

  // Full backup export (JSON)
  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        schoolSettings: formData,
        studentsCount: students.length,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نسخة_إعدادات_المدرسة_${formData.schoolNumber || 'school'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onShowToast('تم تصدير ملف النسخة الاحتياطية بنجاح', 'success');
    } catch {
      onShowToast('فشل في تصدير النسخة الاحتياطية', 'error');
    }
  };

  // Import backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.schoolSettings) {
          setFormData((prev) => ({ ...prev, ...parsed.schoolSettings }));
          await updateSchoolSettings(parsed.schoolSettings);
          onShowToast('تمت استعادة إعدادات المدرسة من الملف بنجاح', 'success');
        } else {
          onShowToast('ملف النسخة الاحتياطية غير صالح', 'error');
        }
      } catch {
        onShowToast('خطأ في قراءة ملف النسخة الاحتياطية', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Dynamic template sample preview
  const getRenderedTemplateSample = () => {
    const sampleStudent = students[0] || {
      fullName: 'راشد محمد عبدالله الشامسي',
      grade: 'التاسع',
      section: '1',
    };

    let text = '';
    if (previewTemplate === 'tardiness') {
      text =
        formData.defaultTardinessMessageTemplate ||
        'نحيطكم علماً بتأخر الطالب [اسم_الطالب] عن طابور الصباح اليوم [التاريخ] الساعة [الوقت].';
    } else if (previewTemplate === 'absence') {
      text =
        formData.defaultAbsenceMessageTemplate ||
        'نود إشعاركم بغياب الطالب [اسم_الطالب] اليوم [التاريخ]. يرجى تزويد إدارة المدرسة بالعذر المقبول.';
    } else {
      text =
        formData.defaultMeetingInvitationTemplate ||
        'يرجى من ولي أمر الطالب [اسم_الطالب] التكرم بمراجعة إدارة المدرسة لمقابلة المرشد الأكاديمي.';
    }

    return text
      .replace(/\[اسم_الطالب\]/g, sampleStudent.fullName)
      .replace(/\[الصف\]/g, `${sampleStudent.grade} / ${sampleStudent.section}`)
      .replace(/\[التاريخ\]/g, new Date().toLocaleDateString('ar-AE'))
      .replace(/\[الوقت\]/g, '08:15 ص');
  };

  const navItems: { id: SettingsSection; label: string; icon: React.FC<any> }[] = [
    { id: 'school', label: 'هوية وبيانات المدرسة', icon: School },
    { id: 'schedule', label: 'أوقات الدوام والجدول', icon: Clock },
    { id: 'rules', label: 'ضوابط السلوك والمواظبة', icon: ShieldAlert },
    { id: 'messaging', label: 'المراسلات وأولياء الأمور', icon: MessageSquare },
    ...(isAdmin
      ? [{ id: 'gmail_oauth' as SettingsSection, label: 'ربط Gmail التلقائي (للمسؤول)', icon: Mail }]
      : []),
    { id: 'forms', label: 'النماذج والطباعة الرسمية', icon: FileText },
    { id: 'users', label: 'المستخدمين والصلاحيات', icon: UserCog },
    { id: 'data', label: 'البيانات والنسخ الاحتياطي', icon: Database },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Top Banner & Main Actions */}
      <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#006D77] flex items-center justify-center text-[#D4AF37] shadow-md border border-[#D4AF37]/30 shrink-0">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                إعدادات النظام والتحكم الشامل
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#006D77]/10 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 border border-teal-300/40">
                لوحة الإدارة المركزية
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              التحكم الكامل في هوية المدرسة، مواعيد الدوام، سياسات الانضباط، قوالب التواصل، والنسخ الاحتياطي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            title="استعادة الإعدادات الافتراضية للنظام"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#006D77] to-[#0A4D54] hover:from-[#0A4D54] hover:to-[#006D77] text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-[#D4AF37]" />
            )}
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Subtabs Menu on Right, Content on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar Subtabs */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-2.5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#006D77] text-white shadow-md shadow-[#006D77]/30 ring-1 ring-teal-400/40'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#D4AF37]' : 'text-[#006D77] dark:text-teal-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronLeft className={`w-4 h-4 transition-transform ${isActive ? 'text-white translate-x-0.5' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Quick Summary Pill Box */}
          <div className="bg-gradient-to-br from-[#091C33] to-[#0C2340] text-white rounded-2xl p-4 border border-[#16355C] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#D4AF37]">
              <Sparkles className="w-4 h-4" />
              <span>بيانات المدرسة النشطة</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">المدرسة:</span>
                <span className="font-bold text-white truncate max-w-[140px]">{formData.schoolName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الكود:</span>
                <span className="font-mono text-teal-300">{formData.schoolNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">العام:</span>
                <span>{formData.academicYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الإمارة:</span>
                <span>{formData.emirate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content Area */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSave} className="space-y-6">
            {/* SECTION 1: SCHOOL IDENTITY */}
            {activeSection === 'school' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      هوية وبيانات المدرسة الرسمية
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      هذه البيانات مركزية وتنعكس في الترويسة، السجلات، النماذج الرسمية، وتقارير PDF
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* School Name Arabic */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم المدرسة الرسمي (بالعربية) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.schoolName || ''}
                        onChange={(e) => handleChange('schoolName', e.target.value)}
                        placeholder="مثال: أكاديمية الفجيرة العلمية الإسلامية"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* School Name English */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم الأكاديمية (بالإنجليزية)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.schoolNameEn || ''}
                      onChange={(e) => handleChange('schoolNameEn', e.target.value)}
                      placeholder="e.g. Fujairah Scientific Islamic Academy"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden text-left"
                    />
                  </div>

                  {/* School Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الرقم الوزاري / كود المدرسة <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.schoolNumber || ''}
                        onChange={(e) => handleChange('schoolNumber', e.target.value)}
                        placeholder="مثال: 1001"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Emirate */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الإمارة <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.emirate || 'دبي'}
                      onChange={(e) => handleChange('emirate', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    >
                      {EMIRATES_LIST.map((em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cycle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      المرحلة التعليمية / الحلقة <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.schoolCycle || CYCLES_LIST[0]}
                      onChange={(e) => handleChange('schoolCycle', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    >
                      {CYCLES_LIST.map((cy) => (
                        <option key={cy} value={cy}>
                          {cy}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      نوع المدرسة <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['بنين', 'بنات', 'مشترك'] as const).map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => handleChange('schoolGender', gender)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            formData.schoolGender === gender
                              ? 'bg-[#006D77] text-white border-[#006D77] shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      العام الدراسي <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.academicYear || ''}
                        onChange={(e) => handleChange('academicYear', e.target.value)}
                        placeholder="2025–2026"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Term */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الفصل الدراسي الحالي <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.currentTerm || 'الفصل الدراسي الأول'}
                      onChange={(e) => handleChange('currentTerm', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    >
                      <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                      <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                      <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث</option>
                    </select>
                  </div>

                  {/* Principal Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم مدير المدرسة <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.principalName || ''}
                        onChange={(e) => handleChange('principalName', e.target.value)}
                        placeholder="اسم المدير المعتمد"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Vice Principal Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم نائب المدير
                    </label>
                    <input
                      type="text"
                      value={formData.vicePrincipalName || ''}
                      onChange={(e) => handleChange('vicePrincipalName', e.target.value)}
                      placeholder="اسم نائب المدير"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم هاتف المدرسة
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="04-0000000"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden text-right"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      البريد الإلكتروني الرسمي
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        dir="ltr"
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="info@school.moe.ae"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden text-left"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      العنوان الجغرافي للمدرسة
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="المنطقة، الشارع، الإمارة"
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: SCHEDULE & TIMING */}
            {activeSection === 'schedule' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      أوقات اليوم المدرسي والجدول
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      تحديد مواعيد الحضور والانصراف لحساب التأخير الصباحي والحصص تلقائياً
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Morning Assembly Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      وقت بداية طابور الصباح
                    </label>
                    <input
                      type="time"
                      value={formData.morningAssemblyTime || '07:45'}
                      onChange={(e) => handleChange('morningAssemblyTime', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      موعد اصطفاف الطلبة لبداية اليوم الدراسي
                    </span>
                  </div>

                  {/* Gate Closing Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      وقت إغلاق البوابة وبدء احتساب التأخير <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.gateClosingTime || '08:00'}
                      onChange={(e) => handleChange('gateClosingTime', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    />
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block font-medium">
                      أي وصول بعد هذا الوقت يُسجل تأخيراً صباحياً تلقائياً
                    </span>
                  </div>

                  {/* Regular Dismissal Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      وقت الانصراف (الاثنين - الخميس)
                    </label>
                    <input
                      type="time"
                      value={formData.regularDismissalTime || '14:30'}
                      onChange={(e) => handleChange('regularDismissalTime', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    />
                  </div>

                  {/* Friday Dismissal Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      وقت انصراف يوم الجمعة
                    </label>
                    <input
                      type="time"
                      value={formData.fridayDismissalTime || '11:30'}
                      onChange={(e) => handleChange('fridayDismissalTime', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    />
                  </div>

                  {/* Daily Periods Count */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      عدد الحصص الدراسية اليومية
                    </label>
                    <select
                      value={formData.dailyPeriodsCount || 7}
                      onChange={(e) => handleChange('dailyPeriodsCount', Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    >
                      <option value={6}>6 حصص يومياً</option>
                      <option value={7}>7 حصص يومياً (معتمد)</option>
                      <option value={8}>8 حصص يومياً</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-bold mb-1">المرجع الزمني الرسمي:</p>
                    <p>
                      تُستخدم هذه الأوقات كمصدر موحد لاحتساب التأخير الصباحي وحصة الانصراف لكافة المراحل في لوحة التأخير الصباحي وبطاقات الحضور.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: RULES & THRESHOLDS */}
            {activeSection === 'rules' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      ضوابط الحضور والتأخير والسلوك (الدليل الإجرائي)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      معايير تنبيهات الانضباط المعتمدة وفق القرار الوزاري (851) والدليل الإجرائي
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Tardiness thresholds */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>حدود إجراءات التأخير الصباحي</span>
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        حد التنبيه الشفهي الأول
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.tardinessNoticeThreshold ?? 2}
                        onChange={(e) => handleChange('tardinessNoticeThreshold', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">تأخيرات قبل استدعاء ولي الأمر</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        حد استدعاء ولي الأمر وتوقيع التعهد
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={formData.tardinessPledgeThreshold ?? 3}
                        onChange={(e) => handleChange('tardinessPledgeThreshold', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">المحدد بالدليل: 3 مرات تأخير</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        حد التحويل للجنة إدارة السلوك
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={15}
                        value={formData.tardinessCommitteeThreshold ?? 5}
                        onChange={(e) => handleChange('tardinessCommitteeThreshold', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">المحدد بالدليل: 5 مرات تأخير</span>
                    </div>
                  </div>

                  {/* Absence thresholds */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>حدود إنذارات الغياب والمواظبة</span>
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        حد إصدار الإنذار الأول (أيام غياب)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.absenceWarning1Threshold ?? 3}
                        onChange={(e) => handleChange('absenceWarning1Threshold', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">3 أيام غياب متصلة أو متفرقة</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        حد إصدار الإنذار الثاني واستدعاء ولي الأمر
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={15}
                        value={formData.absenceWarning2Threshold ?? 5}
                        onChange={(e) => handleChange('absenceWarning2Threshold', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">5 أيام غياب متصلة أو متفرقة</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        حد الإجراء النهائي والحرمان / الرسوب
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        value={formData.absenceFinalThreshold ?? 10}
                        onChange={(e) => handleChange('absenceFinalThreshold', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400">10 أيام غياب بدون عذر مقبول</span>
                    </div>
                  </div>
                </div>

                {/* Auto Alerts Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      تفعيل تنبيهات الانضباط التلقائية في الترويسة
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      إظهار إشعار فوري عند تجاوز أي طالب للحدود المحددة أعلاه لمتابعة استدعاء ولي الأمر والتعهدات
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoAlertsEnabled ?? true}
                    onChange={(e) => handleChange('autoAlertsEnabled', e.target.checked)}
                    className="w-5 h-5 accent-[#006D77] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SECTION 4: MESSAGING & WHATSAPP */}
            {activeSection === 'messaging' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      المراسلات وقوالب أولياء الأمور
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      تخصيص قوالب الرسائل السريعة للتأخير والغياب والاستدعاء عبر WhatsApp والبريد
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp Enable */}
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        تفعيل إرسال WhatsApp
                      </span>
                      <span className="text-[10px] text-slate-400">
                        فتح رابط محادثة واتساب المباشرة مع ولي الأمر بضغطة زر
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.whatsappEnabled ?? true}
                      onChange={(e) => handleChange('whatsappEnabled', e.target.checked)}
                      className="w-5 h-5 accent-[#006D77] rounded"
                    />
                  </label>

                  {/* Email Enable */}
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        تفعيل الإشعارات بالبريد
                      </span>
                      <span className="text-[10px] text-slate-400">
                        تجهيز وإرسال التقارير لبريد ولي الأمر المسجل
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.emailNotificationsEnabled ?? true}
                      onChange={(e) => handleChange('emailNotificationsEnabled', e.target.checked)}
                      className="w-5 h-5 accent-[#006D77] rounded"
                    />
                  </label>
                </div>

                {/* Templates Section */}
                <div className="space-y-4">
                  {/* Template Subtabs */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate('tardiness')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        previewTemplate === 'tardiness'
                          ? 'bg-[#006D77] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      رسالة التأخير الصباحي
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate('absence')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        previewTemplate === 'absence'
                          ? 'bg-[#006D77] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      رسالة الغياب اليومي
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate('summon')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        previewTemplate === 'summon'
                          ? 'bg-[#006D77] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      رسالة استدعاء ولي الأمر
                    </button>
                  </div>

                  {/* Template Editor */}
                  {previewTemplate === 'tardiness' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        نص قالب رسالة التأخير الصباحي
                      </label>
                      <textarea
                        rows={3}
                        value={formData.defaultTardinessMessageTemplate || ''}
                        onChange={(e) => handleChange('defaultTardinessMessageTemplate', e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  )}

                  {previewTemplate === 'absence' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        نص قالب رسالة الغياب اليومي
                      </label>
                      <textarea
                        rows={3}
                        value={formData.defaultAbsenceMessageTemplate || ''}
                        onChange={(e) => handleChange('defaultAbsenceMessageTemplate', e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  )}

                  {previewTemplate === 'summon' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        نص قالب رسالة استدعاء ولي الأمر
                      </label>
                      <textarea
                        rows={3}
                        value={formData.defaultMeetingInvitationTemplate || ''}
                        onChange={(e) => handleChange('defaultMeetingInvitationTemplate', e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* Variables Helper */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="font-bold">المتغيرات المتاحة:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-[#006D77] dark:text-teal-300">
                      [اسم_الطالب]
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-[#006D77] dark:text-teal-300">
                      [الصف]
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-[#006D77] dark:text-teal-300">
                      [التاريخ]
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-[#006D77] dark:text-teal-300">
                      [الوقت]
                    </span>
                  </div>

                  {/* Live Sample Preview */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300 mb-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة حية لشكل الرسالة عند إرسالها لولي الأمر:</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900 leading-relaxed font-medium">
                      {getRenderedTemplateSample()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: OFFICIAL FORMS & PRINTING */}
            {activeSection === 'forms' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      النماذج الرسمية والطباعة (PDF / A4)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      إعدادات مطابقة النماذج الرسمية الصادرة من مؤسسة الإمارات للتعليم المدرسي
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Official Header */}
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        تضمين ترويسة مؤسسة الإمارات للتعليم المدرسي
                      </span>
                      <span className="text-[10px] text-slate-400">
                        إظهار شعار الدولة والوزارة في ترويسة جميع النماذج الرسمية المطبوعة
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.officialHeaderEnabled ?? true}
                      onChange={(e) => handleChange('officialHeaderEnabled', e.target.checked)}
                      className="w-5 h-5 accent-[#006D77] rounded"
                    />
                  </label>

                  {/* Stamp Placeholder */}
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        إظهار موضع الختم الرسمي للمدرسة
                      </span>
                      <span className="text-[10px] text-slate-400">
                        تخصيص مساحة مخصصة للختم المعتمد في أسفل نماذج التعهد والاستدعاء
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.includeStampPlaceholder ?? true}
                      onChange={(e) => handleChange('includeStampPlaceholder', e.target.checked)}
                      className="w-5 h-5 accent-[#006D77] rounded"
                    />
                  </label>

                  {/* Default Approver Role */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      المعتمد الافتراضي في النماذج الرسمية
                    </label>
                    <select
                      value={formData.defaultApproverRole || 'مدير المدرسة'}
                      onChange={(e) => handleChange('defaultApproverRole', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                    >
                      <option value="مدير المدرسة">مدير المدرسة</option>
                      <option value="نائب المدير">نائب المدير</option>
                      <option value="المرشد الأكاديمي والمهني">المرشد الأكاديمي والمهني</option>
                      <option value="رئيس لجنة إدارة السلوك">رئيس لجنة إدارة السلوك</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: USERS & PERMISSIONS */}
            {activeSection === 'users' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      المستخدمين وصلاحيات النظام
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      إدارة حسابات الكادر المدرسي، المرشدين، وشؤون الطلبة
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 to-[#006D77]/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      إدارة حسابات المستخدمين والصلاحيات
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      إضافة وتعديل حسابات المدراء، المرشدين، ومنح صلاحيات التعديل والاعتماد والتقارير
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenUsersManagement) {
                        onOpenUsersManagement();
                      } else if (onNavigateTab) {
                        onNavigateTab('users');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] text-white text-xs font-black shadow-md transition-all cursor-pointer shrink-0"
                  >
                    <UserCog className="w-4 h-4 text-[#D4AF37]" />
                    <span>فتح لوحة المستخدمين والصلاحيات</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">المستخدم الحالي</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {currentUser?.fullName || (currentUser as any)?.name || 'المستخدم'}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">الدور والصلاحية</span>
                    <span className="font-bold text-[#006D77] dark:text-teal-300 text-xs">
                      {currentUser?.role === 'systemAdmin'
                        ? 'مدير النظام'
                        : currentUser?.role === 'schoolAdmin'
                        ? 'مدير المدرسة'
                        : 'مرشد أكاديمي'}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">حالة الحساب</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>نشط ومفعل</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: DATA & BACKUP */}
            {activeSection === 'data' && (
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      إدارة البيانات والنسخ الاحتياطي
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      تصدير واستعادة نسخ احتياطية كاملة لبيانات المدرسة وإعدادات النظام
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Backup Card */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-[#006D77] dark:text-teal-300" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        تصدير نسخة احتياطية
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      حفظ ملف JSON يحتوي على كافة إعدادات وهوية المدرسة والبيانات المسجلة للاحتفاظ بها كنسخة أمان.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4 text-[#D4AF37]" />
                      <span>تنزيل النسخة الاحتياطية (JSON)</span>
                    </button>
                  </div>

                  {/* Import Backup Card */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        استعادة من ملف احتياطي
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      استيراد ملف نسخة احتياطية سابق (JSON) لاسترجاع الإعدادات والهوية السابقة بنقرة واحدة.
                    </p>
                    <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-700">
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>اختيار ملف النسخة الاحتياطية</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Firestore Cloud Status Box */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                        قاعدة بيانات Firestore السحابية متصلة ومزامنة تلقائياً
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        معرف المدرسة الأساسي: {formData.schoolId}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 font-bold text-emerald-700 dark:text-emerald-300">
                    مزامنة نشطة
                  </span>
                </div>
              </div>
            )}

            {/* ADMIN-ONLY SECTION: GMAIL OAUTH 2.0 & AUTOMATED NOTIFICATIONS */}
            {activeSection === 'gmail_oauth' && isAdmin && (
              <div onClick={(e) => e.stopPropagation()}>
                <GmailOAuthIntegrationPanel
                  schoolId={formData.schoolId || '7001'}
                  currentUser={currentUser}
                  students={students}
                  violations={violations}
                  onOpenStudentProfile={onOpenStudentProfile}
                  onShowToast={onShowToast}
                />
              </div>
            )}

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-400">
                تذكر الضغط على «حفظ التغييرات» بعد تعديل أي قسم لتثبيت الإعدادات في قاعدة البيانات
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#006D77] to-[#0A4D54] hover:from-[#0A4D54] hover:to-[#006D77] text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-[#D4AF37]" />
                )}
                <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات الآن'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
