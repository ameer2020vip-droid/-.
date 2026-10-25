import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  AlertTriangle,
  FolderPlus,
  ShieldCheck,
  Calendar,
  Lock,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import {
  Student,
  StudentCaseRecord,
  CaseType,
  CaseReferralSource,
  CaseConfidentialityLevel,
  CaseStatus,
  AppUser,
} from '../../types';
import { getUaeTodayDateString } from '../../utils/time';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  existingCases: StudentCaseRecord[];
  currentUser: AppUser;
  onSaveCase: (caseRecord: Omit<StudentCaseRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StudentCaseRecord>;
  onOpenExistingCase?: (caseId: string) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  students,
  existingCases,
  currentUser,
  onSaveCase,
  onOpenExistingCase,
}) => {
  // Search student query
  const [searchStudentText, setSearchStudentText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields
  const [academicYear, setAcademicYear] = useState('2026–2027');
  const [openedAt, setOpenedAt] = useState(getUaeTodayDateString());
  const [caseType, setCaseType] = useState<CaseType>('سلوكية');
  const [subcategory, setSubcategory] = useState('');
  const [referralSource, setReferralSource] = useState<CaseReferralSource>('المرشد');
  const [referralReason, setReferralReason] = useState('');
  const [initialSummary, setInitialSummary] = useState('');
  const [assignedCounselorName, setAssignedCounselorName] = useState(
    currentUser.displayName || currentUser.name || 'المرشد المدرسي'
  );
  const [confidentialityLevel, setConfidentialityLevel] = useState<CaseConfidentialityLevel>('عادي');
  const [status, setStatus] = useState<CaseStatus>('مفتوح');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

  // Duplicate Warning Modal state
  const [duplicateWarningCase, setDuplicateWarningCase] = useState<StudentCaseRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate next case number
  const generatedCaseNumber = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const count = existingCases.length + 1;
    return `CASE-${currentYear}-${String(count).padStart(4, '0')}`;
  }, [existingCases]);

  // Filter students for picker
  const filteredStudents = useMemo(() => {
    if (!searchStudentText.trim()) return [];
    const query = searchStudentText.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(query) ||
          s.studentNumber.toLowerCase().includes(query) ||
          s.nationalId?.includes(query)
      )
      .slice(0, 8);
  }, [searchStudentText, students]);

  if (!isOpen) return null;

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchStudentText('');
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setSearchStudentText('');
  };

  // Submit check
  const handleSubmit = async (forceDuplicate = false) => {
    if (!selectedStudent) {
      alert('يرجى اختيار الطالب أولاً');
      return;
    }
    if (!referralReason.trim()) {
      alert('يرجى كتابة سبب الإحالة أو اكتشاف الحالة');
      return;
    }

    // Check duplicate
    if (!forceDuplicate) {
      const activeDuplicate = existingCases.find(
        (c) =>
          c.studentId === selectedStudent.id &&
          c.caseType === caseType &&
          c.status !== 'مغلق' &&
          c.status !== 'مؤرشف' &&
          !c.isArchived
      );
      if (activeDuplicate) {
        setDuplicateWarningCase(activeDuplicate);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newCaseData: Omit<StudentCaseRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        schoolId: currentUser.schoolId || 'alkhalil-school',
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentNumber: selectedStudent.studentNumber,
        grade: selectedStudent.grade,
        section: selectedStudent.section,
        academicYear,
        caseNumber: generatedCaseNumber,
        caseType,
        subcategory: subcategory.trim() || undefined,
        referralSource,
        referralReason,
        initialSummary: initialSummary || referralReason,
        confidentialityLevel,
        status,
        assignedCounselorId: currentUser.uid || currentUser.id,
        assignedCounselorName,
        openedAt,
        nextFollowUpAt: nextFollowUpAt || null,
        closedAt: status === 'مغلق' ? getUaeTodayDateString() : null,
        createdBy: currentUser.displayName || currentUser.email,
        updatedBy: currentUser.displayName || currentUser.email,
      };

      await onSaveCase(newCaseData);
      onClose();
    } catch (err: any) {
      alert('حدث خطأ أثناء فتح ملف الحالة: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
      setDuplicateWarningCase(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-5 bg-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                فتح ملف حالة وإرشاد جديد
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-800/80 text-teal-200 font-mono font-bold">
                  {generatedCaseNumber}
                </span>
              </h3>
              <p className="text-xs text-teal-200 mt-0.5">
                إنشاء ملف حالة موحّد يربط استمارات الإرشاد ودراسة الحالة والخطط العلاجية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Step 1: اختيار الطالب */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="block font-bold text-slate-800 dark:text-slate-100">
              اختيار الطالب المستهدف *
            </label>

            {!selectedStudent ? (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم الرباعي أو الرقم الطلابي أو الهوية..."
                    value={searchStudentText}
                    onChange={(e) => setSearchStudentText(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {filteredStudents.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredStudents.map((st) => (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => handleSelectStudent(st)}
                        className="w-full text-right p-3 hover:bg-teal-50/60 dark:hover:bg-teal-950/40 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{st.fullName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            الرقم الطلابي: {st.studentNumber} • {st.grade} ({st.section})
                          </span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold">
                          اختيار
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedStudent.fullName}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      الرقم الطلابي: {selectedStudent.studentNumber} • {selectedStudent.grade} ({selectedStudent.section})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedStudent}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
                >
                  تغيير الطالب
                </button>
              </div>
            )}
          </div>

          {/* Step 2: بيانات الحالة الأساسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">العام الدراسي</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ فتح الحالة</label>
              <input
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مصدر الإحالة *</label>
              <select
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="الطالب نفسه">الطالب نفسه</option>
                <option value="ولي الأمر">ولي الأمر</option>
                <option value="المعلم">المعلم</option>
                <option value="المرشد">المرشد الطلابي</option>
                <option value="رئيس وحدة شؤون الطلبة">رئيس وحدة شؤون الطلبة</option>
                <option value="مدير المدرسة">مدير المدرسة</option>
                <option value="الإدارة المدرسية">الإدارة المدرسية</option>
                <option value="جهة خارجية">جهة خارجية</option>
                <option value="أخرى">أخرى...</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نوع الحالة *</label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-teal-800 dark:text-teal-300"
              >
                <option value="أكاديمية">أكاديمية</option>
                <option value="سلوكية">سلوكية</option>
                <option value="حضور وغياب">حضور وغياب</option>
                <option value="اجتماعية">اجتماعية</option>
                <option value="أسرية">أسرية</option>
                <option value="صحية">صحية</option>
                <option value="نفسية">نفسية</option>
                <option value="حماية طفل">حماية طفل (سري ومحمي)</option>
                <option value="متعددة الجوانب">متعددة الجوانب</option>
                <option value="أخرى">أخرى...</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                التصنيف الفرعي <span className="text-[10px] font-normal text-slate-500">(اختياري)</span>
              </label>
              <input
                type="text"
                placeholder="مثال: تأخر دراسي، تنمر، قلق، تدخين..."
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مستوى السرية *</label>
              <select
                value={confidentialityLevel}
                onChange={(e) => setConfidentialityLevel(e.target.value as any)}
                className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl font-bold ${
                  confidentialityLevel === 'سري جدًا'
                    ? 'border-rose-400 text-rose-700 dark:text-rose-400'
                    : confidentialityLevel === 'مقيّد'
                    ? 'border-amber-400 text-amber-700 dark:text-amber-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <option value="عادي">عادي (Normal)</option>
                <option value="مقيّد">مقيّد (Restricted)</option>
                <option value="سري جدًا">سري جدًا (Top Secret)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">حالة الملف *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="مسودة">مسودة</option>
                <option value="مفتوح">مفتوح (Open)</option>
                <option value="قيد التقييم">قيد التقييم (Under Assessment)</option>
                <option value="توجد خطة تدخل">توجد خطة تدخل</option>
                <option value="قيد المتابعة">قيد المتابعة</option>
                <option value="محوّل">محوّل</option>
                <option value="مغلق">مغلق</option>
                <option value="مؤرشف">مؤرشف</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المرشد المسؤول</label>
              <input
                type="text"
                value={assignedCounselorName}
                onChange={(e) => setAssignedCounselorName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">موعد المتابعة القادمة</label>
              <input
                type="date"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {/* السبب والملخص */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                سبب الإحالة أو اكتشاف الحالة *
              </label>
              <textarea
                rows={2}
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="صف سبب فتح ملف الحالة أو الوقائع الملاحظة..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                الملخص الأولي للمرشد
              </label>
              <textarea
                rows={2}
                value={initialSummary}
                onChange={(e) => setInitialSummary(e.target.value)}
                placeholder="ملاحظات أولية، توصيات مبدئية، جوانب التدخل المقترحة..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={isSubmitting || !selectedStudent}
            onClick={() => handleSubmit(false)}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            {isSubmitting ? 'جاري فتح الملف...' : 'إنشاء وحفظ ملف الحالة'}
          </button>
        </div>

        {/* Duplicate Case Confirmation Warning Dialog */}
        {duplicateWarningCase && (
          <div className="absolute inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  تنبيه: يوجد ملف حالة قائم لهذا الطالب
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  يوجد مسبقاً ملف حالة نشط للطالب <span className="font-bold text-slate-900 dark:text-white">({selectedStudent?.fullName})</span> تحت تصنيف <span className="font-bold text-teal-700 dark:text-teal-300">({caseType})</span> برقم <span className="font-mono font-bold">({duplicateWarningCase.caseNumber})</span> ومفتوح بتاريخ {duplicateWarningCase.openedAt}.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  هل تود فتح الملف القائم وإضافة النماذج إليه، أم تفضل إنشاء ملف حالة مستقل جديد؟
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {onOpenExistingCase && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenExistingCase(duplicateWarningCase.id);
                      onClose();
                    }}
                    className="w-full py-2.5 bg-teal-700 text-white rounded-xl font-bold text-xs hover:bg-teal-800 shadow-xs"
                  >
                    فتح ملف الحالة القائم ({duplicateWarningCase.caseNumber})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="w-full py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700"
                >
                  متابعة إنشاء ملف حالة إضافي جديد
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarningCase(null)}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200"
                >
                  الرجوع وتعديل البيانات
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
