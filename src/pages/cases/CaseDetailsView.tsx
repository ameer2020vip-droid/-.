import React, { useState } from 'react';
import {
  ArrowRight,
  Printer,
  Archive,
  Lock,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Layers,
  HeartHandshake,
  Brain,
  Activity,
  FolderOpen,
  History,
  FileCheck,
  Building,
  GraduationCap,
} from 'lucide-react';
import {
  Student,
  StudentCaseRecord,
  StudentCaseFormRecord,
  AppUser,
} from '../../types';
import { StudentFamilyDataForm } from './StudentFamilyDataForm';
import { PrintableFamilyDataSheet } from './PrintableFamilyDataSheet';
import { IndividualCounselingTab } from './IndividualCounselingTab';

interface CaseDetailsViewProps {
  caseRecord: StudentCaseRecord;
  student?: Student;
  formRecord?: StudentCaseFormRecord | null;
  currentUser: AppUser;
  onBack: () => void;
  onSaveForm: (
    form: StudentCaseFormRecord,
    updateMaster: boolean,
    masterUpdates?: Partial<Student>
  ) => Promise<void>;
  onArchiveCase: (caseId: string) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  canEdit?: boolean;
  canArchive?: boolean;
}

type TabKey =
  | 'summary'
  | 'family-data'
  | 'individual-counseling'
  | 'concerns'
  | 'case-study'
  | 'treatment-plan'
  | 'academic-behavior-followup'
  | 'behavior-tracking'
  | 'protection-followup'
  | 'attachments'
  | 'timeline';

export const CaseDetailsView: React.FC<CaseDetailsViewProps> = ({
  caseRecord,
  student,
  formRecord,
  currentUser,
  onBack,
  onSaveForm,
  onArchiveCase,
  onShowToast,
  canEdit = true,
  canArchive = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('family-data');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Check confidentiality authorization
  const isTopSecret =
    caseRecord.confidentialityLevel === 'سري جدًا' || caseRecord.caseType === 'حماية طفل';
  const isAssignedCounselor =
    currentUser.uid === caseRecord.assignedCounselorId ||
    currentUser.id === caseRecord.assignedCounselorId ||
    currentUser.displayName === caseRecord.assignedCounselorName;
  const isAdmin = currentUser.role === 'systemAdmin' || currentUser.role === 'schoolAdmin';
  const isAuthorized = !isTopSecret || isAssignedCounselor || isAdmin;

  // Handle archive confirmation
  const handleArchive = async () => {
    if (!canArchive) {
      onShowToast('صلاحياتك لا تسمح بأرشفة ملفات الحالات', 'warning');
      return;
    }
    const confirmed = window.confirm(
      `هل أنت متأكد من أرشفة ملف الحالة رقم (${caseRecord.caseNumber}) للطالب (${caseRecord.studentName})؟\nلن يتم حذفه نهائياً وسيتم حفظه في الأرشيف الإرشادي.`
    );
    if (!confirmed) return;

    setIsArchiving(true);
    try {
      await onArchiveCase(caseRecord.id);
      onShowToast(`تم أرشفة ملف الحالة (${caseRecord.caseNumber}) بنجاح`, 'success');
      onBack();
    } catch (err: any) {
      onShowToast('حدث خطأ أثناء أرشفة الحالة', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  const tabs: Array<{ id: TabKey; label: string; icon: any; isCurrentStage: boolean }> = [
    { id: 'summary', label: 'ملخص الحالة', icon: Layers, isCurrentStage: true },
    { id: 'family-data', label: 'بيانات الطالب والأسرة', icon: FileCheck, isCurrentStage: true },
    { id: 'individual-counseling', label: 'استمارة الإرشاد الفردي', icon: HeartHandshake, isCurrentStage: true },
    { id: 'concerns', label: 'المخاوف والاشتباه', icon: AlertCircle, isCurrentStage: false },
    { id: 'case-study', label: 'دراسة الحالة الفردية', icon: Brain, isCurrentStage: false },
    { id: 'treatment-plan', label: 'الخطة العلاجية', icon: Activity, isCurrentStage: false },
    { id: 'academic-behavior-followup', label: 'المتابعة الأكاديمية والسلوكية', icon: GraduationCap, isCurrentStage: false },
    { id: 'behavior-tracking', label: 'متابعة السلوك', icon: Building, isCurrentStage: false },
    { id: 'protection-followup', label: 'متابعة الحماية', icon: Shield, isCurrentStage: false },
    { id: 'attachments', label: 'المرفقات', icon: FolderOpen, isCurrentStage: false },
    { id: 'timeline', label: 'السجل الزمني', icon: History, isCurrentStage: true },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* ---------------------------------------------------------------------- */}
      {/* CASE HEADER BANNER */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              title="العودة إلى إدارة الحالات والإرشاد"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {caseRecord.studentName || student?.fullName || 'ملف حالة الطالب'}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                  {caseRecord.caseNumber}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    caseRecord.status === 'مفتوح'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : caseRecord.status === 'قيد التقييم'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : caseRecord.status === 'توجد خطة تدخل'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : caseRecord.status === 'مغلق'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {caseRecord.status}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    caseRecord.confidentialityLevel === 'سري جدًا'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : caseRecord.confidentialityLevel === 'مقيّد'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  {caseRecord.confidentialityLevel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  الرقم الطلابي: <strong className="text-slate-700 dark:text-slate-200 font-mono">{caseRecord.studentNumber || student?.studentNumber}</strong>
                </span>
                <span>•</span>
                <span>
                  الصف والشعبة: <strong className="text-slate-700 dark:text-slate-200">{caseRecord.grade || student?.grade} ({caseRecord.section || student?.section})</strong>
                </span>
                <span>•</span>
                <span>
                  نوع الحالة: <strong className="text-teal-700 dark:text-teal-300">{caseRecord.caseType}</strong>
                  {caseRecord.subcategory && (
                    <span className="mr-1.5 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-medium text-[11px]">
                      {caseRecord.subcategory}
                    </span>
                  )}
                </span>
                <span>•</span>
                <span>
                  المرشد المسؤول: <strong className="text-slate-700 dark:text-slate-200">{caseRecord.assignedCounselorName || 'المرشد المدرسي'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              طباعة استمارة تحديث البيانات
            </button>

            {canArchive && caseRecord.status !== 'مؤرشف' && (
              <button
                type="button"
                disabled={isArchiving}
                onClick={handleArchive}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {isArchiving ? 'جاري الأرشفة...' : 'أرشفة الحالة'}
              </button>
            )}
          </div>
        </div>

        {/* Confidentiality Alert if Top Secret and Unauthorized */}
        {!isAuthorized && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200 text-xs flex items-center gap-3">
            <Lock className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">حالة سرية / حماية طفل: </span>
              تفاصيل هذه الحالة والنماذج المرفقة بها محمية وخاصة بالمرشد المسؤول وإدارة المدرسة المعتمدة فقط.
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* TABS NAVIGATION */}
        {/* ---------------------------------------------------------------------- */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-1 border-t border-slate-100 dark:border-slate-800 no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t.label}</span>
                {!t.isCurrentStage && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    قريباً
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB CONTENT AREA */}
      {/* ---------------------------------------------------------------------- */}

      {/* TAB 1: ملخص الحالة */}
      {activeTab === 'summary' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-slate-500 block mb-1">مصدر الإحالة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{caseRecord.referralSource}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-slate-500 block mb-1">تاريخ فتح الحالة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{caseRecord.openedAt}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-slate-500 block mb-1">موعد المتابعة القادمة</span>
              <span className="font-bold text-teal-700 dark:text-teal-300 text-sm">
                {caseRecord.nextFollowUpAt || 'غير محدد بعد'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-slate-500 block mb-1">استمارة بيانات الطالب والأسرة</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                {formRecord ? formRecord.formStatus : 'قيد الإدخال'}
              </span>
            </div>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">سبب الإحالة أو الوقائع الملاحظة:</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {caseRecord.referralReason || 'لا يوجد سبب مفصل مسجل'}
            </p>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">الملخص الأولي للمرشد:</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {caseRecord.initialSummary || caseRecord.referralReason || 'لا يوجد ملخص أولي مسجل'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('family-data')}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              الانتقال إلى استمارة بيانات الطالب والأسرة
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: استمارة بيانات الطالب والأسرة الموحدة */}
      {activeTab === 'family-data' && (
        <StudentFamilyDataForm
          caseRecord={caseRecord}
          student={student}
          initialForm={formRecord}
          currentUser={currentUser}
          onSave={onSaveForm}
          onPrintPreview={() => setIsPrintModalOpen(true)}
          onShowToast={onShowToast}
          canEdit={canEdit && isAuthorized}
        />
      )}

      {/* TAB 3: استمارة الإرشاد الفردي ودراسة الحالة المصغرة */}
      {activeTab === 'individual-counseling' && (
        <IndividualCounselingTab
          caseRecord={caseRecord}
          student={student}
          currentUser={currentUser}
          onNavigateToTab={(target) => {
            if (target === 'treatment_plan') {
              setActiveTab('treatment-plan');
            } else if (target === 'case_study') {
              setActiveTab('case-study');
            }
          }}
        />
      )}

      {/* OTHER TABS: Placeholders as requested */}
      {activeTab !== 'summary' &&
        activeTab !== 'family-data' &&
        activeTab !== 'individual-counseling' &&
        activeTab !== 'timeline' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
              سيتم إضافة هذا النموذج في المرحلة التالية وفق خطة التطوير التدريجية
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              سيرتبط هذا النموذج مباشرةً بملف الحالة الحالي برقم ({caseRecord.caseNumber}) وسيستخدم بيانات استمارة الطالب والأسرة دون الحاجة لإعادة إدخالها.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('family-data')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              العودة إلى استمارة بيانات الطالب والأسرة
            </button>
          </div>
        </div>
      )}

      {/* TAB 11: السجل الزمني (Timeline) */}
      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-teal-600" />
            السجل الزمني للأحداث وتدقيق الحالة
          </h3>
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-slate-100">تم فتح ملف الحالة</span>
                  <span className="text-[11px] text-slate-500">{caseRecord.openedAt}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  بواسطة: {caseRecord.createdBy} • نوع الحالة: {caseRecord.caseType} • رقم الملف: {caseRecord.caseNumber}
                </p>
              </div>
            </div>

            {formRecord && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      تحديث استمارة بيانات الطالب والأسرة ({formRecord.formStatus})
                    </span>
                    <span className="text-[11px] text-slate-500">{formRecord.updatedAt?.split('T')[0] || '-'}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    بواسطة: {formRecord.updatedBy || formRecord.createdBy}
                  </p>
                </div>
              </div>
            )}

            {caseRecord.isArchived && (
              <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
                <div className="w-2 h-2 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-900 dark:text-rose-200">أرشفة ملف الحالة</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400">{caseRecord.updatedAt?.split('T')[0]}</span>
                  </div>
                  <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                    تمت الأرشفة الإرشادية بواسطة: {caseRecord.updatedBy}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Sheet Modal Overlay */}
      {isPrintModalOpen && formRecord && (
        <PrintableFamilyDataSheet
          caseRecord={caseRecord}
          formRecord={formRecord}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
