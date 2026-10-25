import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Save,
  RotateCcw,
  User,
  Calendar,
  FileSignature,
  Trash2,
  FileText,
  Clock,
  Layers,
  ChevronDown,
  Building2,
  ShieldAlert,
  Hash,
} from 'lucide-react';
import {
  Student,
  TemporarySuspensionFormRecord,
  ViolationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { getUaeTodayDateString, getDayNameFromDateString } from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintTemporarySuspensionModal } from '../components/PrintTemporarySuspensionModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface TemporarySuspensionTabProps {
  students: Student[];
  forms: TemporarySuspensionFormRecord[];
  violations?: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: TemporarySuspensionFormRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  preselectedViolationId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const TemporarySuspensionTab: React.FC<TemporarySuspensionTabProps> = ({
  students,
  forms,
  violations = [],
  currentUser,
  onSaveForm,
  onDeleteForm,
  onShowToast,
  preselectedStudentId,
  preselectedViolationId,
  onOpenGradeSectionSearch,
}) => {
  const { schoolSettings } = useSchoolSettings();

  // Selected student & search
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  // Selected violation
  const [selectedViolationId, setSelectedViolationId] = useState<string>('');

  // Manual Meeting Number (CRITICAL: Manual input only, no auto-increment, no guessing)
  const [meetingNumber, setMeetingNumber] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<string>(getUaeTodayDateString());
  const [meetingDay, setMeetingDay] = useState<string>(getDayNameFromDateString(getUaeTodayDateString()));

  // Suspension Period
  const [suspensionStartDate, setSuspensionStartDate] = useState<string>(getUaeTodayDateString());
  const [suspensionStartDay, setSuspensionStartDay] = useState<string>(getDayNameFromDateString(getUaeTodayDateString()));
  const [suspensionEndDate, setSuspensionEndDate] = useState<string>(getUaeTodayDateString());
  const [suspensionEndDay, setSuspensionEndDay] = useState<string>(getDayNameFromDateString(getUaeTodayDateString()));
  const [suspensionDaysCount, setSuspensionDaysCount] = useState<number>(3);
  const [behaviorModificationProgram, setBehaviorModificationProgram] = useState<string>(
    'التكليف بواجبات وتطبيقات دراسية يومية داخل المدرسة تحت إشراف المرشد الأكاديمي، مع جلسات إرشاد وتعديل سلوك فردية.'
  );

  // Prior actions
  const [priorAction1, setPriorAction1] = useState<string>('تنبيه خطي للطالب واستدعاء ولي الأمر وأخذ التعهدات السلوكية اللازمة.');
  const [priorAction2, setPriorAction2] = useState<string>('جلسات إرشاد وتوجيه ومتابعة مع المرشد الأكاديمي وإخطار ولي الأمر بالحسم.');

  // Reasons for suspension
  const [reason1, setReason1] = useState<string>('');
  const [reason2, setReason2] = useState<string>('');
  const [reason3, setReason3] = useState<string>('');

  // Student & Guardian Info
  const [parentName, setParentName] = useState<string>('');
  const [parentPhone, setParentPhone] = useState<string>('');

  // Signatures
  const [principalName, setPrincipalName] = useState<string>(
    schoolSettings.principalName || 'مدير المدرسة'
  );
  const [principalSignature, setPrincipalSignature] = useState<string | undefined>(undefined);
  const [studentSignature, setStudentSignature] = useState<string | undefined>(undefined);
  const [parentSignature, setParentSignature] = useState<string | undefined>(undefined);

  const [formStatus, setFormStatus] = useState<'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم'>('معتمد ومسلّم');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<TemporarySuspensionFormRecord | null>(null);

  // Table filter
  const [filterSearch, setFilterSearch] = useState('');

  // Update day name when meeting date changes
  const handleMeetingDateChange = (d: string) => {
    setMeetingDate(d);
    setMeetingDay(getDayNameFromDateString(d));
  };

  // Update start day when start date changes
  const handleStartDateChange = (d: string) => {
    setSuspensionStartDate(d);
    setSuspensionStartDay(getDayNameFromDateString(d));
  };

  // Update end day when end date changes
  const handleEndDateChange = (d: string) => {
    setSuspensionEndDate(d);
    setSuspensionEndDay(getDayNameFromDateString(d));
  };

  // Auto-fill from preselected student
  useEffect(() => {
    if (preselectedStudentId) {
      const st = students.find((s) => s.id === preselectedStudentId || s.studentNumber === preselectedStudentId);
      if (st) handleSelectStudent(st);
    }
  }, [preselectedStudentId, students]);

  // Auto-fill from preselected violation
  useEffect(() => {
    if (preselectedViolationId && violations.length > 0) {
      const v = violations.find((item) => item.id === preselectedViolationId);
      if (v) {
        setSelectedViolationId(v.id);
        if (v.violationName && !reason1) {
          setReason1(v.violationName + (v.notes ? ` - ${v.notes}` : ''));
        }
      }
    }
  }, [preselectedViolationId, violations]);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setStudentSearch('');
    setIsSearchingStudent(false);
    setParentName(st.parentName || `السيد ولي أمر الطالب ${st.fullName}`);
    setParentPhone(st.parentPhone || st.guardianPhone || '');

    // Check student violations to link or prefill reason
    const studentViols = violations.filter((v) => v.studentId === st.id);
    if (studentViols.length > 0) {
      const latest = studentViols[0];
      setSelectedViolationId(latest.id);
      setReason1(latest.violationName || latest.notes || 'تكرار المخالفات السلوكية وعدم الاستجابة للتوجيهات');
      if (studentViols.length > 1) {
        setReason2(studentViols[1].violationName || studentViols[1].notes || '');
      }
    }
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setActiveFormId(null);
    setSelectedViolationId('');
    setMeetingNumber('');
    setMeetingDate(getUaeTodayDateString());
    setMeetingDay(getDayNameFromDateString(getUaeTodayDateString()));
    setSuspensionStartDate(getUaeTodayDateString());
    setSuspensionStartDay(getDayNameFromDateString(getUaeTodayDateString()));
    setSuspensionEndDate(getUaeTodayDateString());
    setSuspensionEndDay(getDayNameFromDateString(getUaeTodayDateString()));
    setSuspensionDaysCount(3);
    setPriorAction1('تنبيه خطي للطالب واستدعاء ولي الأمر وأخذ التعهدات السلوكية اللازمة.');
    setPriorAction2('جلسات إرشاد وتوجيه ومتابعة مع المرشد الأكاديمي وإخطار ولي الأمر بالحسم.');
    setReason1('');
    setReason2('');
    setReason3('');
    setParentName('');
    setParentPhone('');
    setPrincipalSignature(undefined);
    setStudentSignature(undefined);
    setParentSignature(undefined);
    setFormStatus('معتمد ومسلّم');
  };

  const handleEditExistingForm = (f: TemporarySuspensionFormRecord) => {
    setActiveFormId(f.id);
    const st = students.find((s) => s.id === f.studentId || s.studentNumber === f.studentNumber);
    if (st) setSelectedStudent(st);

    setSelectedViolationId(f.violationId || '');
    setMeetingNumber(f.meetingNumber || '');
    setMeetingDate(f.meetingDate || getUaeTodayDateString());
    setMeetingDay(f.meetingDay || getDayNameFromDateString(f.meetingDate || getUaeTodayDateString()));
    setSuspensionStartDate(f.suspensionStartDate || getUaeTodayDateString());
    setSuspensionStartDay(f.suspensionStartDay || getDayNameFromDateString(f.suspensionStartDate || getUaeTodayDateString()));
    setSuspensionEndDate(f.suspensionEndDate || getUaeTodayDateString());
    setSuspensionEndDay(f.suspensionEndDay || getDayNameFromDateString(f.suspensionEndDate || getUaeTodayDateString()));
    setSuspensionDaysCount(f.suspensionDaysCount || 3);
    setBehaviorModificationProgram(f.behaviorModificationProgram || '');
    setPriorAction1(f.priorAction1 || '');
    setPriorAction2(f.priorAction2 || '');
    setReason1(f.reason1 || '');
    setReason2(f.reason2 || '');
    setReason3(f.reason3 || '');
    setParentName(f.parentName || '');
    setParentPhone(f.parentPhone || '');
    setPrincipalName(f.principalName || schoolSettings.principalName || 'مدير المدرسة');
    setPrincipalSignature(f.principalSignature);
    setStudentSignature(f.studentSignature);
    setParentSignature(f.parentSignature);
    setFormStatus(f.status || 'معتمد ومسلّم');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`تم تحميل نموذج الإيقاف رقم (${f.meetingNumber || f.id}) للتحرير`, 'info');
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى تحديد الطالب أولاً لإصدار قرار الإيقاف المؤقت', 'error');
      return;
    }

    if (!reason1.trim()) {
      onShowToast('يرجى كتابة سبب واحد على الأقل لقرار الإيقاف المؤقت (السبب الأول مطلوب)', 'warning');
      return;
    }

    const schoolId = schoolSettings.schoolId || 'default-school';
    const formRecord: TemporarySuspensionFormRecord = {
      id: activeFormId || `TSF-${schoolId}-${Date.now()}`,
      formType: 'temporary_suspension_form',
      formNumber: 12,
      schoolId,
      emirate: schoolSettings.emirate || '',
      operationsManagement: 'إدارة العمليات المدرسية',
      council: schoolSettings.schoolCycle || '',
      sector: '',
      schoolName: schoolSettings.schoolName || '',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber || '',
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName.trim() || selectedStudent.parentName || `السيد ولي أمر الطالب ${selectedStudent.fullName}`,
      parentPhone: parentPhone.trim() || selectedStudent.parentPhone || selectedStudent.guardianPhone || '',
      violationId: selectedViolationId || undefined,

      priorAction1: priorAction1.trim(),
      priorAction2: priorAction2.trim(),

      // MANUAL INPUT ONLY (no auto-increment, no guessing)
      meetingNumber: meetingNumber.trim(),
      meetingDay: meetingDay.trim() || getDayNameFromDateString(meetingDate),
      meetingDate: meetingDate,

      suspensionStartDay: suspensionStartDay.trim() || getDayNameFromDateString(suspensionStartDate),
      suspensionStartDate: suspensionStartDate,
      suspensionEndDay: suspensionEndDay.trim() || getDayNameFromDateString(suspensionEndDate),
      suspensionEndDate: suspensionEndDate,
      suspensionDaysCount: Number(suspensionDaysCount) || 1,
      behaviorModificationProgram: behaviorModificationProgram.trim(),

      reason1: reason1.trim(),
      reason2: reason2.trim() || undefined,
      reason3: reason3.trim() || undefined,

      principalName: principalName.trim() || schoolSettings.principalName || 'مدير المدرسة',
      principalSignature,
      principalSignatureDate: getUaeTodayDateString(),

      studentSignature,
      studentSignatureDate: getUaeTodayDateString(),

      parentSignature,
      parentSignatureDate: getUaeTodayDateString(),

      issueDate: getUaeTodayDateString(),
      status: formStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.fullName || currentUser?.email || 'system',
    };

    try {
      await onSaveForm(formRecord);
      onShowToast(
        `تم حفظ "قرار إيقاف مؤقت من الدراسة (نموذج 12)" بنجاح للطالب ${selectedStudent.fullName}`,
        'success'
      );
      setFormToPrint(formRecord);
      setIsPrintModalOpen(true);
      handleResetForm();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'حدث خطأ أثناء حفظ النموذج', 'error');
    }
  };

  // Filtered student list for search dropdown
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          (s.studentNumber && s.studentNumber.toLowerCase().includes(q)) ||
          (s.grade && s.grade.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [students, studentSearch]);

  // Filtered forms in table
  const filteredForms = useMemo(() => {
    if (!filterSearch.trim()) return forms;
    const q = filterSearch.trim().toLowerCase();
    return forms.filter(
      (f) =>
        f.studentName.toLowerCase().includes(q) ||
        (f.studentNumber && f.studentNumber.toLowerCase().includes(q)) ||
        (f.meetingNumber && f.meetingNumber.toLowerCase().includes(q)) ||
        (f.grade && f.grade.toLowerCase().includes(q))
    );
  }, [forms, filterSearch]);

  // Student violations list for linking
  const studentViolations = useMemo(() => {
    if (!selectedStudent) return [];
    return violations.filter(
      (v) => v.studentId === selectedStudent.id || v.studentNumber === selectedStudent.studentNumber
    );
  }, [selectedStudent, violations]);

  return (
    <div className="space-y-8" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0C2340] to-rose-950 text-white p-6 rounded-3xl shadow-xl border border-rose-900/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
              <span>ملحق (12) – القرار الوزاري رقم (851) لسنة 2018م</span>
            </div>
            <h2 className="text-2xl font-black font-['Tajawal'] tracking-wide">
              نموذج رقم (12): قرار إيقاف مؤقت من الدراسة
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              إصدار قرار رسمي ومعتمد من لجنة إدارة سلوك الطلبة بإيقاف الطالب مؤقتاً داخل المدرسة وتكليفه بواجبات وجلسات تعديل السلوك، وربط القرار بالمخالفة دون تكرار التسجيل.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeFormId && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <FileSignature className="w-4 h-4" />
                وضع التعديل
              </span>
            )}
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              نموذج جديد
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white dark:bg-[#0c1626] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8">
        {/* Step 1: Student Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#006D77]" />
              <span>1. بيانات الطالب والمدرسة</span>
            </h3>
            {onOpenGradeSectionSearch && (
              <button
                type="button"
                onClick={onOpenGradeSectionSearch}
                className="text-xs text-[#006D77] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                اختيار حسب الصف والشعبة
              </button>
            )}
          </div>

          {selectedStudent ? (
            <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#006D77] text-white flex items-center justify-center font-bold text-lg">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {selectedStudent.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    الرقم الطلابي: {selectedStudent.studentNumber} • الصف: {selectedStudent.grade} (شعبة {selectedStudent.section}) • المسار: {selectedStudent.track || 'عام'}
                  </p>
                  <p className="text-xs text-slate-500">
                    المدرسة: {schoolSettings.schoolName} • الإمارة: {schoolSettings.emirate || 'الإمارات'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold cursor-pointer"
              >
                تغيير الطالب
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="w-5 h-5 absolute right-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setIsSearchingStudent(true);
                  }}
                  onFocus={() => setIsSearchingStudent(true)}
                  placeholder="ابحث عن الطالب بالاسم، الرقم الطلابي، أو الصف..."
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {isSearchingStudent && filteredStudents.length > 0 && (
                <div className="absolute z-20 top-full mt-2 w-full bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredStudents.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStudent(st)}
                      className="w-full p-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-none flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {st.fullName}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {st.studentNumber} • الصف {st.grade} ({st.section})
                        </span>
                      </div>
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        {st.track || 'عام'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linking with Existing Violation */}
          {selectedStudent && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>ربط القرار بمخالفة مسجلة في ملف الطالب (بدون تكرار المخالفة):</span>
              </label>
              {studentViolations.length > 0 ? (
                <select
                  value={selectedViolationId}
                  onChange={(e) => {
                    setSelectedViolationId(e.target.value);
                    const v = studentViolations.find((item) => item.id === e.target.value);
                    if (v && v.violationName) {
                      setReason1(v.violationName + (v.notes ? ` - ${v.notes}` : ''));
                    }
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
                >
                  <option value="">-- ربط بمخالفة مسجلة (اختياري) --</option>
                  {studentViolations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.date} • {v.violationName || 'مخالفة'} • {v.degree === 1 ? 'الدرجة الأولى' : v.degree === 2 ? 'الدرجة الثانية' : v.degree === 3 ? 'الدرجة الثالثة' : 'الدرجة الرابعة'}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  لا توجد مخالفات مسجلة للطالب مسبقاً، سيتم حفظ النموذج وربطه مباشرة بملف الطالب.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Committee Meeting Details (CRITICAL MANUAL INPUT) */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#006D77]" />
            <span>2. بيانات اجتماع لجنة إدارة السلوك</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MANUAL MEETING NUMBER INPUT - CRITICAL REQUIREMENT */}
            <div className="space-y-1.5 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/50 rounded-2xl">
              <label className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-rose-600" />
                <span>رقم اجتماع لجنة إدارة السلوك:</span>
                <span className="text-rose-600 text-xs font-bold">* إدخال يدوي</span>
              </label>
              <input
                type="text"
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(e.target.value)}
                placeholder="أدخل رقم الجلسة يدوياً (مثال: 03/2026)"
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[11px] text-rose-800 dark:text-rose-300">
                لا يتم توليد الرقم تلقائياً، أدخل رقم المحضر المعتمد من قبل اللجنة.
              </p>
            </div>

            {/* Meeting Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#006D77]" />
                <span>تاريخ الاجتماع:</span>
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => handleMeetingDateChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            {/* Meeting Day */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#006D77]" />
                <span>يوم الاجتماع:</span>
              </label>
              <input
                type="text"
                value={meetingDay}
                onChange={(e) => setMeetingDay(e.target.value)}
                placeholder="مثال: الأحد"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Prior Actions Taken */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006D77]" />
            <span>3. الإجراءات السابقة المتخذة بحق الطالب (حسب نص النموذج الرسمي)</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-slate-700 dark:text-slate-300">1-</span>
              <input
                type="text"
                value={priorAction1}
                onChange={(e) => setPriorAction1(e.target.value)}
                placeholder="الإجراء السابق الأول المتخذ بحقه..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-slate-700 dark:text-slate-300">2-</span>
              <input
                type="text"
                value={priorAction2}
                onChange={(e) => setPriorAction2(e.target.value)}
                placeholder="الإجراء السابق الثاني المتخذ بحقه..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Suspension Duration & Program */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-600" />
            <span>4. مدة الإيقاف المؤقت وبرنامج تعديل السلوك</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">من تاريخ:</label>
              <input
                type="date"
                value={suspensionStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            {/* Start Day */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">من يوم:</label>
              <input
                type="text"
                value={suspensionStartDay}
                onChange={(e) => setSuspensionStartDay(e.target.value)}
                placeholder="مثال: الإثنين"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">إلى تاريخ:</label>
              <input
                type="date"
                value={suspensionEndDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            {/* End Day */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">إلى يوم:</label>
              <input
                type="text"
                value={suspensionEndDay}
                onChange={(e) => setSuspensionEndDay(e.target.value)}
                placeholder="مثال: الأربعاء"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            {/* Days count */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">عدد الأيام:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={suspensionDaysCount}
                onChange={(e) => setSuspensionDaysCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>
          </div>

          {/* Behavior Modification program */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              برنامج تعديل السلوك والتكليف بالواجبات داخل المدرسة:
            </label>
            <textarea
              rows={2}
              value={behaviorModificationProgram}
              onChange={(e) => setBehaviorModificationProgram(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#006D77]"
            />
          </div>
        </div>

        {/* Step 5: Reasons for Suspension */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>5. أسباب قرار الإيقاف المؤقت (حسب نص النموذج الرسمي)</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-slate-700 dark:text-slate-300">1-</span>
              <input
                type="text"
                value={reason1}
                onChange={(e) => setReason1(e.target.value)}
                placeholder="السبب الأول (مطلوب: تفاصيل المخالفة أو السلوك غير الإيجابي)..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-slate-700 dark:text-slate-300">2-</span>
              <input
                type="text"
                value={reason2}
                onChange={(e) => setReason2(e.target.value)}
                placeholder="السبب الثاني (اختياري)..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-slate-700 dark:text-slate-300">3-</span>
              <input
                type="text"
                value={reason3}
                onChange={(e) => setReason3(e.target.value)}
                placeholder="السبب الثالث (اختياري)..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
              />
            </div>
          </div>
        </div>

        {/* Step 6: Signatures and Approvals (Principal, Student, Parent) */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[#006D77]" />
            <span>6. التوقيعات والاعتماد الرسمي (حسب النموذج 12 المعتمد)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Principal Approval */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">اعتماد مدير المدرسة</h4>
              <div>
                <label className="text-[11px] text-slate-500 block">اسم المدير:</label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>
              <SignatureCanvas
                label="توقيع مدير المدرسة:"
                signatureData={principalSignature}
                onSaveSignature={(sig) => setPrincipalSignature(sig)}
                onClear={() => setPrincipalSignature(undefined)}
              />
            </div>

            {/* Student Acknowledgement */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">توقيع الطالب بالعلم</h4>
              <p className="text-[11px] text-slate-500">
                إقرار وتوقيع الطالب بالعلم بالقرار والالتزام بالبرنامج
              </p>
              <SignatureCanvas
                label="توقيع الطالب:"
                signatureData={studentSignature}
                onSaveSignature={(sig) => setStudentSignature(sig)}
                onClear={() => setStudentSignature(undefined)}
              />
            </div>

            {/* Parent Signature & Phone */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">توقيع ولي الأمر</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-500 block">اسم ولي الأمر:</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block">هاتف ولي الأمر:</label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <SignatureCanvas
                label="توقيع ولي الأمر:"
                signatureData={parentSignature}
                onSaveSignature={(sig) => setParentSignature(sig)}
                onClear={() => setParentSignature(undefined)}
              />
            </div>
          </div>
        </div>

        {/* Action Controls & Save */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">حالة النموذج:</span>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
              className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="معتمد ومسلّم">معتمد ومسلّم رسمياً</option>
              <option value="بانتظار التوقيع">بانتظار استكمال التوقيعات</option>
              <option value="مسودة">مسودة</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#006D77] hover:bg-[#0C2340] text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>حفظ القرار واعتماد النموذج (12)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Archive Table of Temporary Suspension Forms */}
      <div className="bg-white dark:bg-[#0c1626] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#006D77]" />
              <span>سجل قرارات الإيقاف المؤقت الصادرة (نموذج 12)</span>
            </h3>
            <p className="text-xs text-slate-500">
              إجمالي السجلات الصادرة: {forms.length} قرار
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="تصفية بالاسم أو رقم الجلسة..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>

        {filteredForms.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            لا توجد قرارات إيقاف مؤقت مسجلة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="p-3">الطالب</th>
                  <th className="p-3">الصف والشعبة</th>
                  <th className="p-3">رقم الجلسة</th>
                  <th className="p-3">مدة الإيقاف</th>
                  <th className="p-3">السبب الرئيسي</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredForms.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {f.studentName}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      الصف {f.grade} / {f.section}
                    </td>
                    <td className="p-3 font-mono font-bold text-rose-700 dark:text-rose-400">
                      {f.meetingNumber ? `جلسة (${f.meetingNumber})` : 'غير محدد'}
                    </td>
                    <td className="p-3 font-medium">
                      من {f.suspensionStartDate} إلى {f.suspensionEndDate} ({f.suspensionDaysCount || 1} يوم)
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600 dark:text-slate-400" title={f.reason1}>
                      {f.reason1}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.status === 'معتمد ومسلّم'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormToPrint(f);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-xs text-[#006D77] hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                          title="معاينة وطباعة النموذج الرسمي (A4)"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditExistingForm(f)}
                          className="p-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="تعديل"
                        >
                          <FileSignature className="w-4 h-4" />
                        </button>
                        {onDeleteForm && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف قرار الإيقاف للطالب "${f.studentName}"؟`)) {
                                onDeleteForm(f.id, f.studentName);
                              }
                            }}
                            className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Print Modal (Strict A4 Layout) */}
      <PrintTemporarySuspensionModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setFormToPrint(null);
        }}
        form={formToPrint}
      />
    </div>
  );
};
