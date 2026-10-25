import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Save,
  RotateCcw,
  Clock,
  Phone,
  User,
  Building,
  Calendar,
  FileSignature,
  Trash2,
  Send,
  MessageSquare,
  Plus,
  ShieldCheck,
  FileText,
  Lock,
  Layers,
} from 'lucide-react';
import {
  Student,
  ParentCommitmentFormRecord,
  ViolationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import {
  getUaeTodayDateString,
  getFormattedDateParts,
} from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintParentCommitmentModal } from '../components/PrintParentCommitmentModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface ParentCommitmentFormTabProps {
  students: Student[];
  forms: ParentCommitmentFormRecord[];
  violations?: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: ParentCommitmentFormRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

const COMMON_REPEATED_VIOLATIONS = [
  'التأخر الصباحي والتأخر المتكرر عن الحصص الدراسية بدون عذر مقبول.',
  'استخدام الهاتف المتحرك داخل الحرم المدرسي وأثناء الحصص دون إذن رسمي.',
  'الخروج المتكرر من الفصل الدراسي والتجول في ممرات المدرسة أثناء الحصص.',
  'عدم الالتزام بالزي المدرسي المعتمد والمظهر اللائق بلائحة السلوك.',
  'إثارة الفوضى ومقاطعة شرح المعلم وعدم الامتثال للتعليمات المدرسية.',
  'عدم إحضار الكتب المدرسية وأدوات التعلم والتكاسل عن أداء الواجبات.',
  'التلفظ بعبارات غير لائقة وعدم الالتزام بآداب التعامل مع الزملاء والكوادر.',
  'الإضرار بمرافق وممتلكات وأثاث المدرسة والعبث بأجهزة الصفوف.',
];

export const ParentCommitmentFormTab: React.FC<ParentCommitmentFormTabProps> = ({
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
  // Form State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const { schoolSettings } = useSchoolSettings();

  // Administrative hierarchy
  const [emirate, setEmirate] = useState(schoolSettings.emirate || 'دبي');
  const [operationsManagement, setOperationsManagement] = useState('إدارة العمليات المدرسية');
  const [council, setCouncil] = useState('المجلس التعليمي 2');
  const [sector, setSector] = useState('نطاق 2');
  const [schoolName, setSchoolName] = useState(schoolSettings.schoolName);

  // Parent info
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('ولي الأمر');

  // Repeated violations list (minimum 3 lines matching official form)
  const [violationsList, setViolationsList] = useState<string[]>([
    '',
    '',
    '',
  ]);

  // Signatures
  const [parentSignature, setParentSignature] = useState<string | undefined>(undefined);
  const [vicePrincipalName, setVicePrincipalName] = useState('سلطان سالم الكعبي');
  const [vicePrincipalSignature, setVicePrincipalSignature] = useState<string | undefined>(undefined);

  // Date and Status
  const [issueDate, setIssueDate] = useState<string>(getUaeTodayDateString());
  const [formStatus, setFormStatus] = useState<'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم'>('معتمد ومسلّم');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [formToPrint, setFormToPrint] = useState<ParentCommitmentFormRecord | null>(null);

  // Auto-fill from preselected student
  useEffect(() => {
    if (preselectedStudentId) {
      const st = students.find((s) => s.id === preselectedStudentId || s.studentNumber === preselectedStudentId);
      if (st) {
        handleSelectStudent(st);
      }
    }
  }, [preselectedStudentId, students]);

  // Handle student selection
  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setStudentSearch('');
    setIsSearchingStudent(false);
    setParentName(st.parentName || '');
    setParentPhone(st.parentPhone || st.guardianPhone || '');
    setParentRelation(st.parentRelation || 'ولي الأمر');

    if (st.schoolEmirate) setEmirate(st.schoolEmirate);
    if (st.schoolNameAr) setSchoolName(st.schoolNameAr);
    if (st.council) setCouncil(st.council);
    if (st.sector) setSector(st.sector);

    // Auto-populate violations if available
    const stViolations = violations.filter(
      (v) => v.studentId === st.id || v.studentNumber === st.studentNumber
    );

    if (stViolations.length > 0) {
      const recent = stViolations.slice(0, 3).map(
        (v) => `${v.violationType}: ${v.incidentDescription || ''} (بتاريخ ${v.createdAt.slice(0, 10)})`
      );
      while (recent.length < 3) {
        recent.push('');
      }
      setViolationsList(recent);
    }
  };

  // Filter students for search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          (s.parentPhone && s.parentPhone.includes(q))
      )
      .slice(0, 8);
  }, [students, studentSearch]);

  // Student's recorded violations
  const studentViolations = useMemo(() => {
    if (!selectedStudent) return [];
    return violations.filter(
      (v) => v.studentId === selectedStudent.id || v.studentNumber === selectedStudent.studentNumber
    );
  }, [selectedStudent, violations]);

  // Violations list handlers
  const handleViolationChange = (index: number, val: string) => {
    setViolationsList((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddViolationLine = () => {
    setViolationsList((prev) => [...prev, '']);
  };

  const handleRemoveViolationLine = (index: number) => {
    if (violationsList.length <= 1) return;
    setViolationsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyViolationPreset = (text: string) => {
    // Fill first empty slot or add new line
    const emptyIdx = violationsList.findIndex((v) => !v.trim());
    if (emptyIdx !== -1) {
      handleViolationChange(emptyIdx, text);
    } else {
      setViolationsList((prev) => [...prev, text]);
    }
    onShowToast('تمت إضافة المخالفة إلى قائمة التعهد', 'info');
  };

  // Reset form
  const handleReset = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setParentName('');
    setParentPhone('');
    setViolationsList(['', '', '']);
    setParentSignature(undefined);
    setVicePrincipalSignature(undefined);
    setFormStatus('معتمد ومسلّم');
    setActiveFormId(null);
    setIssueDate(getUaeTodayDateString());
    onShowToast('تمت إعادة تعيين نموذج التعهد', 'info');
  };

  // Load existing form for editing
  const handleLoadForm = (form: ParentCommitmentFormRecord) => {
    setActiveFormId(form.id);
    const st = students.find((s) => s.id === form.studentId || s.studentNumber === form.studentNumber);
    if (st) {
      setSelectedStudent(st);
    } else {
      setSelectedStudent({
        id: form.studentId,
        studentNumber: form.studentNumber,
        fullName: form.studentName,
        grade: form.grade,
        section: form.section,
        track: 'عام',
        status: 'متابع سلوكيًا',
        parentName: form.parentName,
        parentPhone: form.parentPhone || '',
        parentRelation: form.parentRelation || 'ولي الأمر',
        totalTardiness: 0,
        totalViolations: 0,
      });
    }

    setEmirate(form.emirate);
    setOperationsManagement(form.operationsManagement);
    setCouncil(form.council);
    setSector(form.sector);
    setSchoolName(form.schoolName);
    setParentName(form.parentName);
    setParentPhone(form.parentPhone || '');
    setParentRelation(form.parentRelation || 'ولي الأمر');

    const vList = form.violationsList && form.violationsList.length > 0 ? form.violationsList : ['', '', ''];
    while (vList.length < 3) {
      vList.push('');
    }
    setViolationsList(vList);

    setParentSignature(form.parentSignature);
    setVicePrincipalName(form.vicePrincipalName);
    setVicePrincipalSignature(form.vicePrincipalSignature);
    setIssueDate(form.issueDate);
    setFormStatus(form.status);

    onShowToast(`تم تحميل تعهد الطالب: ${form.studentName}`, 'info');
  };

  // Build current record object
  const buildCurrentFormRecord = (): ParentCommitmentFormRecord => {
    if (!selectedStudent) {
      throw new Error('يرجى تحديد الطالب أولاً.');
    }

    const schoolId = currentUser?.schoolId || 'alkhalil-school';
    const formId = activeFormId || `PC-${schoolId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    return {
      id: formId,
      formType: 'parent_commitment_form',
      formNumber: 10,
      schoolId,
      emirate: emirate.trim() || 'الفجيرة',
      operationsManagement: operationsManagement.trim() || 'إدارة العمليات المدرسية 2',
      council: council.trim() || 'المجلس التعليمي 2',
      sector: sector.trim() || 'نطاق 2',
      schoolName: schoolName.trim() || schoolSettings.schoolName,
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      parentName: parentName.trim() || selectedStudent.parentName || 'ولي الأمر',
      parentPhone: parentPhone.trim() || selectedStudent.parentPhone || '',
      parentRelation: parentRelation.trim() || 'ولي الأمر',
      violationsList: violationsList.map((v) => v.trim()).filter(Boolean),
      parentSignature,
      parentSignatureDate: parentSignature ? issueDate : undefined,
      vicePrincipalName: vicePrincipalName.trim() || 'مساعد مدير المدرسة',
      vicePrincipalSignature,
      vicePrincipalSignatureDate: vicePrincipalSignature ? issueDate : undefined,
      issueDate: issueDate || getUaeTodayDateString(),
      status: formStatus,
      isLocked: formStatus === 'معتمد ومسلّم',
      createdBy: currentUser?.name || currentUser?.email || 'المساعد الإداري',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: formStatus === 'معتمد ومسلّم' ? currentUser?.name || currentUser?.email : undefined,
      approvedAt: formStatus === 'معتمد ومسلّم' ? new Date().toISOString() : undefined,
    };
  };

  // Save handler
  const handleSave = async (overrideStatus?: 'مسودة' | 'معتمد ومسلّم') => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب لإصدار التعهد', 'warning');
      return;
    }

    const validViolations = violationsList.filter((v) => v.trim());
    if (validViolations.length === 0) {
      onShowToast('يرجى كتابة مخالفة واحدة على الأقل في بنود التعهد', 'warning');
      return;
    }

    try {
      const record = buildCurrentFormRecord();
      if (overrideStatus) {
        record.status = overrideStatus;
        setFormStatus(overrideStatus);
      }
      await onSaveForm(record);
      setActiveFormId(record.id);
    } catch (err: any) {
      onShowToast(err?.message || 'تعذر حفظ التعهد', 'error');
    }
  };

  // Print Preview
  const handleOpenPrint = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار طالب لمعاينة وطباعة التعهد', 'warning');
      return;
    }
    try {
      const record = buildCurrentFormRecord();
      setFormToPrint(record);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      onShowToast(err?.message || 'خطأ في إعداد المعاينة', 'error');
    }
  };

  // WhatsApp sender
  const handleSendWhatsApp = () => {
    if (!selectedStudent) {
      onShowToast('يرجى تحديد الطالب أولاً', 'warning');
      return;
    }
    const phone = parentPhone || selectedStudent.parentPhone;
    if (!phone) {
      onShowToast('رقم هاتف ولي الأمر غير مسجل', 'warning');
      return;
    }

    const validViolations = violationsList.filter((v) => v.trim());
    const violationsText = validViolations
      .map((v, i) => `${i + 1}- ${v}`)
      .join('\n');

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('971')
      ? cleanPhone
      : cleanPhone.startsWith('05')
      ? '971' + cleanPhone.slice(1)
      : cleanPhone;

    const message = `*دولة الإمارات العربية المتحدة*
*مؤسسة الإمارات للتعليم المدرسي*
*${schoolName}*
----------------------------------------
*تعهد ولي الأمر في حال تكرار مخالفات الطالب (نموذج 10)*
وفق القرار الوزاري رقم (851) بشأن لائحة إدارة سلوك الطلبة.

السيد ولي أمر الطالب/ة: *${selectedStudent.fullName}*
الصف: *${selectedStudent.grade}* - شعبة: *${selectedStudent.section}*

نحيطكم علماً بأنه نظراً لتكرار المخالفات السلوكية الصادرة عن الطالب/ة، والمتمثلة في:
${violationsText || 'المخالفات السلوكية الموثقة لدى إدارة المدرسة'}

يُرجى العلم بتسجيل هذا التعهد الرسمي بملف الطالب لضمان الالتزام بقواعد السلوك والأنظمة المدرسية، وحماية لمصلحته ومستقبله التعليمي.

شاكرين تعاونكم الدائم لما فيه مصلحة أبنائنا الطلبة.
*يعتمد، إدارة المدرسة*
تحريراً في: ${issueDate}`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    onShowToast('تم تجهيز رسالة التعهد لولي الأمر عبر واتساب', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0C2340] via-[#133054] to-[#0C2340] text-white p-5 rounded-2xl shadow-md border-b-4 border-[#D4AF37] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#D4AF37] text-slate-950 font-black text-xs px-2.5 py-1 rounded-md">
              نموذج رقم (10)
            </span>
            <span className="text-xs text-slate-300 font-medium">
              ملحق (10) للقرار الوزاري رقم (851) لسنة 2018م
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
            تعهد ولي الأمر في حال تكرار مخالفات الطالب / الطالبة
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            توثيق التعهد الرسمي الملزم لولي الأمر بتحمل الإجراءات المترتبة على تكرار المخالفات وفق اللائحة الوزارية لإدارة سلوك الطلبة
          </p>
        </div>

        {/* Quick Stats & Print Button */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15 text-center min-w-[110px]">
            <span className="text-[11px] text-slate-300 block">إجمالي التعهدات</span>
            <span className="text-xl font-black text-[#D4AF37]">{forms.length}</span>
          </div>

          <button
            type="button"
            id="btn-print-parent-commitment-top"
            onClick={handleOpenPrint}
            disabled={!selectedStudent}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
              selectedStudent
                ? 'bg-[#006D77] hover:bg-[#005a63] text-white cursor-pointer'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>معاينة وطباعة A4</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on Large): Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Student Selection Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#006D77]" />
                <span>1. بيانات الطالب المستهدف بالتعهد</span>
              </h3>

              {selectedStudent && (
                <button
                  type="button"
                  onClick={() => setIsSearchingStudent(true)}
                  className="text-xs text-[#006D77] hover:underline font-bold cursor-pointer"
                >
                  تغيير الطالب
                </button>
              )}
            </div>

            {/* Search Input */}
            {(!selectedStudent || isSearchingStudent) && (
              <div className="relative mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="input-search-student-commitment"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="ابحث باسم الطالب أو رقمه الطلابي أو هاتف ولي الأمر..."
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#006D77] text-slate-900"
                      autoFocus
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>

                  {onOpenGradeSectionSearch && (
                    <button
                      type="button"
                      onClick={onOpenGradeSectionSearch}
                      className="px-3.5 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                      title="البحث عن طريق الصفوف والشعب والمسارات"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#006D77]" />
                      <span className="hidden sm:inline">البحث بالصفوف والشعب</span>
                    </button>
                  )}
                </div>

                {/* Dropdown list */}
                {filteredStudents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredStudents.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectStudent(st)}
                        className="w-full text-right p-3 hover:bg-teal-50 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-sm text-slate-900 group-hover:text-[#006D77] block">
                            {st.fullName}
                          </span>
                          <span className="text-xs text-slate-500">
                            الرقم: {st.studentNumber} | الصف {st.grade} - {st.section}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          ولي الأمر: {st.parentName || 'مسجل'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Student Badge */}
            {selectedStudent && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-slate-900">
                      {selectedStudent.fullName}
                    </span>
                    <span className="text-xs bg-[#006D77]/10 text-[#006D77] font-bold px-2 py-0.5 rounded-full border border-[#006D77]/30">
                      رقم: {selectedStudent.studentNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>الصف: <strong>{selectedStudent.grade}</strong></span>
                    <span>الشعبة: <strong>{selectedStudent.section}</strong></span>
                    <span>ولي الأمر: <strong>{selectedStudent.parentName || 'غير مسجل'}</strong></span>
                    <span className="dir-ltr text-right">الهاتف: <strong>{selectedStudent.parentPhone || '—'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">
                    مخالفات مسجلة: {studentViolations.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Official Header Hierarchy Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#006D77]" />
              <span>2. الترويسة الإدارية الرسمية للنموذج</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إمارة:
                </label>
                <input
                  type="text"
                  value={emirate}
                  onChange={(e) => setEmirate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إدارة العمليات المدرسية:
                </label>
                <input
                  type="text"
                  value={operationsManagement}
                  onChange={(e) => setOperationsManagement(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المجلس:
                </label>
                <input
                  type="text"
                  value={council}
                  onChange={(e) => setCouncil(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نطاق:
                </label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مدرسة:
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>
            </div>
          </div>

          {/* 3. Parent Details & Pledge Text Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-[#006D77]" />
              <span>3. صيغة تعهد ولي الأمر والمخالفات المكررة</span>
            </h3>

            {/* Parent Info inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم ولي الأمر (أتعهد أنا):
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="اسم ولي الأمر كاملاً..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  صلة القرابة:
                </label>
                <input
                  type="text"
                  value={parentRelation}
                  onChange={(e) => setParentRelation(e.target.value)}
                  placeholder="الأب / الأم / الوصي..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم هاتف ولي الأمر:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="050xxxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77] dir-ltr text-right"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Statutory Pledge Notice Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-700 font-medium">
              <span className="font-bold text-slate-900 block mb-1">
                النص الإلزامي للتعهد (وفق نموذج 10 المعتمد):
              </span>
              «أتعهد أنا / <strong>{parentName || 'ولي الأمر'}</strong>، ولي أمر الطالب / الطالبة: <strong>{selectedStudent?.fullName || 'الطالب المحدد'}</strong> في الصف: <strong>{selectedStudent ? `${selectedStudent.grade} - ${selectedStudent.section}` : '......'}</strong>، بالتزام ابني / ابنتي بقواعد السلوك والنظام داخل المدرسة، والمحافظة على مرافقها، واتباع التعليمات والنظم المدرسية، وفي حالة مخالفته أكون متحملاً لكافة الإجراءات التي تطبقها إدارة المدرسة بحقه وفق ما جاء في لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام وإنني قد أُحطت علمًا بالمخالفات الصادرة عنه، والتي تمثلت في الآتي:»
            </div>

            {/* Quick Presets for Violations */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                قوالب مخالفات شائعة (انقر للإضافة السريعة إلى التعهد):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_REPEATED_VIOLATIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyViolationPreset(preset)}
                    className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-[#006D77] hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-right"
                  >
                    + {preset.slice(0, 48)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Student's Logged Violations (if any) */}
            {studentViolations.length > 0 && (
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>المخالفات المسجلة مسبقاً لهذا الطالب في النظام:</span>
                </div>
                <div className="space-y-1.5">
                  {studentViolations.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-rose-100 text-xs"
                    >
                      <span className="text-slate-800 font-medium truncate max-w-md">
                        <strong>{v.violationDegree.split(' ')[0]}:</strong> {v.violationType} ({v.createdAt.slice(0, 10)})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyViolationPreset(
                            `${v.violationType}: ${v.incidentDescription || ''}`
                          )
                        }
                        className="text-[11px] font-bold text-[#006D77] hover:underline cursor-pointer"
                      >
                        إدراج في التعهد
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Numbered Violations Inputs (1-, 2-, 3-...) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  قائمة المخالفات الصادرة عن الطالب (1- ، 2- ، 3- ...):
                </label>
                <button
                  type="button"
                  onClick={handleAddViolationLine}
                  className="text-xs font-bold text-[#006D77] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند مخالفة إضافي</span>
                </button>
              </div>

              {violationsList.map((violation, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-700 min-w-[28px] text-center">
                    {idx + 1}-
                  </span>
                  <input
                    type="text"
                    value={violation}
                    onChange={(e) => handleViolationChange(idx, e.target.value)}
                    placeholder={`المخالفة ${idx + 1} وتفاصيلها...`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#006D77]"
                  />
                  {violationsList.length > 3 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveViolationLine(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer"
                      title="حذف هذا البند"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Signatures & Attestation Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#006D77]" />
              <span>4. التوقيعات الرقمية واعتماد مساعد مدير المدرسة</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Parent Signature Pad */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    توقيع ولي أمر الطالب:
                  </span>
                  {parentSignature && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                      تم التوقيع
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  توقيع ولي الأمر بالعلم والالتزام بكافة الشروط
                </p>
                <SignatureCanvas
                  initialSignature={parentSignature}
                  onSave={(sig) => setParentSignature(sig)}
                  onClear={() => setParentSignature(undefined)}
                />
              </div>

              {/* Vice Principal Signature & Endorsement Pad */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    يعتمد، مساعد مدير المدرسة:
                  </span>
                  {vicePrincipalSignature && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                      معتمد
                    </span>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    value={vicePrincipalName}
                    onChange={(e) => setVicePrincipalName(e.target.value)}
                    placeholder="اسم مساعد مدير المدرسة..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-[#006D77] mb-2"
                  />
                </div>
                <SignatureCanvas
                  initialSignature={vicePrincipalSignature}
                  onSave={(sig) => setVicePrincipalSignature(sig)}
                  onClear={() => setVicePrincipalSignature(undefined)}
                />
              </div>
            </div>

            {/* Date and Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">تحريراً في:</span>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">حالة النموذج:</span>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="معتمد ومسلّم">معتمد ومسلّم رسمياً</option>
                  <option value="بانتظار التوقيع">بانتظار توقيع ولي الأمر</option>
                  <option value="مسودة">مسودة غير معتمدة</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-save-parent-commitment-final"
                onClick={() => handleSave('معتمد ومسلّم')}
                className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>اعتماد وحفظ التعهد</span>
              </button>

              <button
                type="button"
                id="btn-save-parent-commitment-draft"
                onClick={() => handleSave('مسودة')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>حفظ كمسودة</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-whatsapp-commitment"
                onClick={handleSendWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال لولي الأمر واتساب</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPrint}
                className="px-3.5 py-2 bg-[#0C2340] hover:bg-[#133054] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>معاينة الطباعة A4</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                title="إعادة تعيين النموذج"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Issued Commitments Archive & Quick History */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#006D77]" />
                <span>سجل تعهدات تكرار المخالفات ({forms.length})</span>
              </h3>
            </div>

            {forms.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <FileSignature className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs">لم يتم إصدار أي تعهدات (نموذج 10) حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {forms.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      activeFormId === item.id
                        ? 'border-[#006D77] bg-teal-50/40 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                    onClick={() => handleLoadForm(item)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-bold text-xs text-slate-900">
                        {item.studentName}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'معتمد ومسلّم'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1">
                      <div>الصف: {item.grade} - {item.section}</div>
                      <div>ولي الأمر: {item.parentName}</div>
                      <div>عدد المخالفات: {item.violationsList.filter(Boolean).length}</div>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span>تحريراً في: {item.issueDate}</span>
                        {item.isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormToPrint(item);
                          setIsPrintModalOpen(true);
                        }}
                        className="p-1 text-[#006D77] hover:bg-teal-100 rounded-md text-[11px] flex items-center gap-1 font-bold"
                        title="طباعة"
                      >
                        <Printer className="w-3 h-3" />
                        <span>طباعة</span>
                      </button>

                      {onDeleteForm && !item.isLocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل أنت متأكد من حذف تعهد الطالب ${item.studentName}؟`)) {
                              onDeleteForm(item.id, item.studentName);
                            }
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded-md"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legal Notice Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>السند القانوني لنموذج (10)</span>
            </span>
            <p className="leading-relaxed text-[11px] text-amber-800 text-justify">
              يُعد نموذج رقم (10) تعهداً قانونياً ملزماً صادراً بموجب ملحق القرار الوزاري رقم (851) لسنة 2018م. يُحرر في حال تكرار المخالفات السلوكية لإلزام ولي الأمر بالتعاون مع المدرسة وتحمل الإجراءات التربوية والإدارية المترتبة على استمرار السلوك غير المتوافق مع اللائحة.
            </p>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {isPrintModalOpen && formToPrint && (
        <PrintParentCommitmentModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setFormToPrint(null);
          }}
          form={formToPrint}
        />
      )}
    </div>
  );
};
