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
  Percent,
  Layers,
} from 'lucide-react';
import {
  Student,
  BehaviorDeductionNoticeRecord,
  ViolationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { getUaeTodayDateString } from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintDeductionNoticeModal } from '../components/PrintDeductionNoticeModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface BehaviorDeductionNoticeTabProps {
  students: Student[];
  forms: BehaviorDeductionNoticeRecord[];
  violations?: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: BehaviorDeductionNoticeRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const BehaviorDeductionNoticeTab: React.FC<BehaviorDeductionNoticeTabProps> = ({
  students,
  forms,
  violations = [],
  currentUser,
  onSaveForm,
  onDeleteForm,
  onShowToast,
  preselectedStudentId,
  onOpenGradeSectionSearch,
}) => {
  // Selection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  // Form Fields
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [violationDegree, setViolationDegree] = useState('الدرجة الثانية');
  const { schoolSettings } = useSchoolSettings();

  const [violationDescription, setViolationDescription] = useState('');
  const [committeeDecisionNumber, setCommitteeDecisionNumber] = useState('01/2026');
  const [committeeDecisionDate, setCommitteeDecisionDate] = useState(getUaeTodayDateString());
  const [deductedMarks, setDeductedMarks] = useState<number>(4);
  const [term, setTerm] = useState(schoolSettings.currentTerm || 'الفصل الدراسي الثاني');
  const [academicYear, setAcademicYear] = useState(schoolSettings.academicYear || '2025/2026م');
  const [recoveryProposals, setRecoveryProposals] = useState<string[]>([
    'الالتزام بالسلوك الإيجابي التام والمواظبة على الدوام المدرسي دون أي مخالفة لمدة 4 أسابيع متتالية.',
    'المشاركة الفعالة في الأنشطة التطوعية والمبادرات المدرسية وخدمة البيئة المدرسية.',
    'تقديم مشروع أو تقرير تثقيفي يعزز قيم الانضباط ومساعدة الزملاء بإشراف المرشد الطلابي.',
  ]);

  // Signatures
  const [parentSignature, setParentSignature] = useState<string | undefined>(undefined);
  const [parentReceiptName, setParentReceiptName] = useState('');
  const [principalName, setPrincipalName] = useState(
    schoolSettings.principalName || `إدارة ${schoolSettings.schoolName}`
  );
  const [principalSignature, setPrincipalSignature] = useState<string | undefined>(undefined);

  const [formStatus, setFormStatus] = useState<'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم'>('معتمد ومسلّم');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<BehaviorDeductionNoticeRecord | null>(null);

  // Table Filter
  const [filterSearch, setFilterSearch] = useState('');

  // Auto-fill from preselected
  useEffect(() => {
    if (preselectedStudentId) {
      const st = students.find((s) => s.id === preselectedStudentId || s.studentNumber === preselectedStudentId);
      if (st) handleSelectStudent(st);
    }
  }, [preselectedStudentId, students]);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setStudentSearch('');
    setIsSearchingStudent(false);
    setParentName(st.parentName || `ولي أمر الطالب ${st.fullName}`);
    setParentPhone(st.parentPhone || st.guardianPhone || '');
    setParentReceiptName(st.parentName || '');

    // Check recent student violations to auto-fill
    const studentViols = violations.filter((v) => v.studentId === st.id);
    if (studentViols.length > 0) {
      const latest = studentViols[0];
      setViolationDegree(
        latest.degree === 1
          ? 'الدرجة الأولى'
          : latest.degree === 2
          ? 'الدرجة الثانية'
          : latest.degree === 3
          ? 'الدرجة الثالثة'
          : 'الدرجة الرابعة'
      );
      setViolationDescription(latest.violationName || latest.notes || '');
      setDeductedMarks(latest.behaviorDeduction || 4);
    }
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setActiveFormId(null);
    setParentName('');
    setParentPhone('');
    setViolationDegree('الدرجة الثانية');
    setViolationDescription('');
    setCommitteeDecisionNumber('01/2026');
    setCommitteeDecisionDate(getUaeTodayDateString());
    setDeductedMarks(4);
    setParentSignature(undefined);
    setParentReceiptName('');
    setPrincipalSignature(undefined);
    setFormStatus('معتمد ومسلّم');
    setRecoveryProposals([
      'الالتزام بالسلوك الإيجابي التام والمواظبة على الدوام المدرسي دون أي مخالفة لمدة 4 أسابيع متتالية.',
      'المشاركة الفعالة في الأنشطة التطوعية والمبادرات المدرسية وخدمة البيئة المدرسية.',
      'تقديم مشروع أو تقرير تثقيفي يعزز قيم الانضباط ومساعدة الزملاء بإشراف المرشد الطلابي.',
    ]);
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }
    if (!violationDescription.trim()) {
      onShowToast('يرجى إدخال وصف المخالفة السلوكية', 'warning');
      return;
    }

    const newId = activeFormId || `BD-${Date.now().toString().slice(-6)}`;
    const now = getUaeTodayDateString();

    const record: BehaviorDeductionNoticeRecord = {
      id: newId,
      formType: 'behavior_deduction_notice',
      formNumber: 20,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      parentPhone,
      violationDegree,
      violationDescription,
      committeeDecisionNumber,
      committeeDecisionDate,
      deductedMarks,
      term,
      academicYear,
      recoveryProposals,
      parentSignature,
      parentSignatureDate: parentSignature ? now : undefined,
      parentReceiptName,
      principalName,
      principalSignature,
      principalSignatureDate: principalSignature ? now : now,
      status: formStatus,
      createdAt: now,
      updatedAt: now,
    };

    await onSaveForm(record);
    setActiveFormId(newId);
    onShowToast('تم حفظ واعتماد إخطار الحسم من درجة السلوك بنجاح', 'success');
  };

  const handleOpenPrintCurrent = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً لمعاينة النموذج', 'warning');
      return;
    }
    const currentForm: BehaviorDeductionNoticeRecord = {
      id: activeFormId || 'PREVIEW',
      formType: 'behavior_deduction_notice',
      formNumber: 20,
      schoolId: selectedStudent.schoolId || 'school-1',
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName || selectedStudent.guardianName || selectedStudent.fullName,
      parentPhone,
      violationDegree,
      violationDescription,
      committeeDecisionNumber,
      committeeDecisionDate,
      deductedMarks,
      term,
      academicYear,
      recoveryProposals,
      parentSignature,
      parentReceiptName,
      principalName,
      principalSignature,
      status: formStatus,
      createdAt: getUaeTodayDateString(),
      updatedAt: getUaeTodayDateString(),
    };
    setFormToPrint(currentForm);
    setIsPrintModalOpen(true);
  };

  const handleLoadSaved = (item: BehaviorDeductionNoticeRecord) => {
    const st = students.find((s) => s.id === item.studentId);
    if (st) setSelectedStudent(st);
    setActiveFormId(item.id);
    setParentName(item.parentName);
    setParentPhone(item.parentPhone || '');
    setViolationDegree(item.violationDegree);
    setViolationDescription(item.violationDescription);
    setCommitteeDecisionNumber(item.committeeDecisionNumber);
    setCommitteeDecisionDate(item.committeeDecisionDate);
    setDeductedMarks(item.deductedMarks);
    setTerm(item.term);
    setAcademicYear(item.academicYear);
    setRecoveryProposals(item.recoveryProposals || []);
    setParentSignature(item.parentSignature);
    setParentReceiptName(item.parentReceiptName || item.parentName);
    setPrincipalName(item.principalName);
    setPrincipalSignature(item.principalSignature);
    setFormStatus(item.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`تم تحميل الإخطار رقم ${item.id}`, 'info');
  };

  const filteredHistory = useMemo(() => {
    return forms.filter((f) => {
      const q = filterSearch.toLowerCase();
      return (
        f.studentName.toLowerCase().includes(q) ||
        f.studentNumber.toLowerCase().includes(q) ||
        f.violationDescription.toLowerCase().includes(q)
      );
    });
  }, [forms, filterSearch]);

  const searchedStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [students, studentSearch]);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#0C2340] to-[#1E3A8A] text-white p-6 rounded-2xl shadow-lg border-b-4 border-[#D4AF37] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-bold mb-2">
            <span>ملحق (20) للقرار الوزاري رقم (851) لسنة 2018 م</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <Percent className="w-6 h-6 text-[#D4AF37]" />
            <span>نموذج رقم (20): إخطار بالحسم من درجة السلوك</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-2xl">
            توثيق رسمي لحسم درجات السلوك معتمد بقرار لجنة السلوك، مع مقترحات تمكين الطالب من استرجاع جزء من الدرجة وفقاً للائحة السلوك المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPrintCurrent}
            className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>معاينة الطباعة الرسمية (A4)</span>
          </button>
          <button
            type="button"
            onClick={handleResetForm}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إفراغ الحقول</span>
          </button>
        </div>
      </div>

      {/* Main Form Editor */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8 space-y-6">
        {/* Step 1: Student Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            اختيار الطالب المعني بالحسم:
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-slate-300 rounded-xl p-2 bg-slate-50 focus-within:bg-white focus-within:border-[#0C2340] transition-all flex-1">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setIsSearchingStudent(true);
                  }}
                  placeholder="ابحث باسم الطالب أو الرقم الطلابي..."
                  className="w-full bg-transparent border-none text-sm focus:outline-hidden"
                />
              </div>

              {onOpenGradeSectionSearch && (
                <button
                  type="button"
                  onClick={onOpenGradeSectionSearch}
                  className="px-3 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                  title="البحث عن طريق الصفوف والشعب والمسارات"
                >
                  <Layers className="w-3.5 h-3.5 text-[#006D77]" />
                  <span className="hidden sm:inline">البحث بالصفوف والشعب</span>
                </button>
              )}
            </div>

            {isSearchingStudent && searchedStudents.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl overflow-hidden divide-y divide-slate-100">
                {searchedStudents.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStudent(st)}
                    className="w-full text-right p-3 hover:bg-blue-50/70 transition-colors flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{st.fullName}</span>
                      <span className="text-xs text-slate-500 mr-2">({st.grade} / {st.section})</span>
                    </div>
                    <span className="font-mono text-xs text-[#006D77] font-semibold">{st.studentNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="mt-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2 font-bold text-[#0C2340]">
                <User className="w-4 h-4 text-[#006D77]" />
                <span>الطالب المحدد: {selectedStudent.fullName}</span>
                <span className="font-normal text-slate-600">({selectedStudent.grade} - {selectedStudent.section})</span>
              </div>
              <div className="text-slate-600">
                <span>رقم الطالب: </span>
                <span className="font-mono font-bold text-slate-800">{selectedStudent.studentNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ولي أمر الطالب / الطالبة:
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="اسم ولي الأمر..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#0C2340] focus:ring-1 focus:ring-[#0C2340] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم هاتف ولي الأمر:
            </label>
            <input
              type="text"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="050-XXXXXXX"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#0C2340] focus:ring-1 focus:ring-[#0C2340] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              درجة المخالفة السلوكية:
            </label>
            <select
              value={violationDegree}
              onChange={(e) => setViolationDegree(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:border-[#0C2340] outline-hidden"
            >
              <option value="الدرجة الأولى">مخالفة من الدرجة الأولى</option>
              <option value="الدرجة الثانية">مخالفة من الدرجة الثانية</option>
              <option value="الدرجة الثالثة">مخالفة من الدرجة الثالثة</option>
              <option value="الدرجة الرابعة">مخالفة من الدرجة الرابعة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              مقدار درجات الحسم من السلوك:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={deductedMarks}
                onChange={(e) => setDeductedMarks(Number(e.target.value))}
                min={1}
                max={20}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-red-600 focus:border-[#0C2340] outline-hidden"
              />
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">درجات من 100</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              وصف المخالفة السلوكية المرتكبة:
            </label>
            <textarea
              rows={2}
              value={violationDescription}
              onChange={(e) => setViolationDescription(e.target.value)}
              placeholder="اكتب هنا تفاصيل ومسمى المخالفة السلوكية..."
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-[#0C2340] focus:ring-1 focus:ring-[#0C2340] outline-hidden leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم قرار لجنة السلوك بالمدرسة:
            </label>
            <input
              type="text"
              value={committeeDecisionNumber}
              onChange={(e) => setCommitteeDecisionNumber(e.target.value)}
              placeholder="مثال: 02/2026"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#0C2340] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تاريخ قرار لجنة السلوك:
            </label>
            <input
              type="date"
              value={committeeDecisionDate}
              onChange={(e) => setCommitteeDecisionDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#0C2340] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الفصل الدراسي:
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:border-[#0C2340] outline-hidden"
            >
              <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
              <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
              <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              العام الدراسي:
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#0C2340] outline-hidden"
            />
          </div>
        </div>

        {/* Proposals for mark recovery */}
        <div className="pt-2">
          <label className="block text-sm font-bold text-slate-800 mb-2">
            مقترحات استرجاع جزء من الدرجة (وفقاً للائحة السلوك):
          </label>
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {recoveryProposals.map((prop, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-bold text-[#006D77] text-sm min-w-[24px]">{idx + 1}-</span>
                <input
                  type="text"
                  value={prop}
                  onChange={(e) => {
                    const next = [...recoveryProposals];
                    next[idx] = e.target.value;
                    setRecoveryProposals(next);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs md:text-sm bg-white focus:border-[#0C2340] outline-hidden"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Signatures Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          {/* Parent Signature */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              توقيع ولي الأمر بالاستلام (رقمي / لوحة رسم):
            </label>
            <SignatureCanvas
              onSave={(dataUrl) => setParentSignature(dataUrl)}
              onClear={() => setParentSignature(undefined)}
              title="لوحة توقيع ولي الأمر"
            />
            {parentSignature && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم تثبيت توقيع ولي الأمر
              </p>
            )}
          </div>

          {/* School Principal Signature */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              اعتماد مدير / مديرة المدرسة:
            </label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  اسم مدير / مديرة المدرسة:
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                />
              </div>
              <div className="pt-2">
                <SignatureCanvas
                  onSave={(dataUrl) => setPrincipalSignature(dataUrl)}
                  onClear={() => setPrincipalSignature(undefined)}
                  title="اعتماد وتوقيع الإدارة المدرسية"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">حالة النموذج:</span>
            <select
              value={formStatus}
              onChange={(e: any) => setFormStatus(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-[#0C2340]"
            >
              <option value="معتمد ومسلّم">معتمد ومسلّم لولي الأمر</option>
              <option value="بانتظار التوقيع">بانتظار توقيع ولي الأمر</option>
              <option value="مسودة">مسودة غير مكتملة</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#0C2340] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>حفظ واعتماد النموذج</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPrintCurrent}
              className="px-5 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>معاينة الطباعة (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#006D77]" />
              <span>سجل إخطارات الحسم السابقة (نموذج 20)</span>
            </h3>
            <p className="text-xs text-slate-500">
              إجمالي النماذج المسجلة: {forms.length} نموذج
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="تصفية السجلات السابقة..."
              className="w-full border border-slate-300 rounded-xl p-2 text-xs focus:border-[#0C2340] outline-hidden"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            لا توجد إخطارات حسم مسجلة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="p-3">رقم الإخطار</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الصف</th>
                  <th className="p-3">درجة المخالفة</th>
                  <th className="p-3">مقدار الحسم</th>
                  <th className="p-3">تاريخ الإصدار</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-semibold text-slate-800">{rec.id}</td>
                    <td className="p-3 font-bold text-[#0C2340]">{rec.studentName}</td>
                    <td className="p-3 text-slate-600">{rec.grade} / {rec.section}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {rec.violationDegree}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-red-600">-{rec.deductedMarks} درجات</td>
                    <td className="p-3 text-slate-600">{rec.createdAt}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormToPrint(rec);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-[#006D77] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="طباعة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSaved(rec)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="تعديل وتعبئة"
                        >
                          <FileSignature className="w-4 h-4" />
                        </button>
                        {onDeleteForm && (
                          <button
                            type="button"
                            onClick={() => onDeleteForm(rec.id, rec.studentName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Print Modal Component */}
      <PrintDeductionNoticeModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={formToPrint}
      />
    </div>
  );
};
