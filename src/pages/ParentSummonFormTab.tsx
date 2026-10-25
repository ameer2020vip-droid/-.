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
  Share2,
  Trash2,
  Eye,
  Send,
  MessageSquare,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  Student,
  ParentSummonFormRecord,
  CounselorUser,
  AppUser,
} from '../types';
import {
  getUaeTodayDateString,
  getUaeTomorrowDateString,
  getDayNameInArabic,
  getFormattedDateParts,
} from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintSummonModal } from '../components/PrintSummonModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface ParentSummonFormTabProps {
  students: Student[];
  forms: ParentSummonFormRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: ParentSummonFormRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  preselectedStudentId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

export const ParentSummonFormTab: React.FC<ParentSummonFormTabProps> = ({
  students,
  forms,
  currentUser,
  onSaveForm,
  onDeleteForm,
  preselectedStudentId,
  onOpenGradeSectionSearch,
}) => {
  const todayStr = getUaeTodayDateString();
  const tomorrowStr = getUaeTomorrowDateString();

  // Search & Student Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || (students.length > 0 ? students[0].id : '')
  );

  const { schoolSettings } = useSchoolSettings();

  // Form State
  const [formId, setFormId] = useState<string>('');
  const [emirate, setEmirate] = useState<string>(schoolSettings.emirate || 'دبي');
  const [council, setCouncil] = useState<string>('مجلس 2');
  const [sector, setSector] = useState<string>('نطاق ج');
  const [school, setSchool] = useState<string>(
    currentUser?.schoolName || schoolSettings.schoolName
  );

  const [summonDate, setSummonDate] = useState<string>(tomorrowStr);
  const [summonDay, setSummonDay] = useState<string>(getDayNameInArabic(tomorrowStr));
  const [summonTime, setSummonTime] = useState<string>('08:30 صباحاً');
  const [subject, setSubject] = useState<string>('');

  const [principalName, setPrincipalName] = useState<string>(
    schoolSettings.principalName || currentUser?.name || 'مدير المدرسة'
  );
  const [principalDate, setPrincipalDate] = useState<string>(todayStr);

  // Student Signature State
  const [studentSignature, setStudentSignature] = useState<string | null>(null);
  const [studentSignatureDate, setStudentSignatureDate] = useState<string>(todayStr);

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [activeFormToPrint, setActiveFormToPrint] = useState<ParentSummonFormRecord | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'archive'>('editor');

  // Find selected student
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId || s.studentNumber === selectedStudentId);
  }, [students, selectedStudentId]);

  // When selected student changes, AUTO-FILL everything ("البيانات الثاني تكتب تلقائي")
  useEffect(() => {
    if (selectedStudent) {
      // Default subject suggestion based on student's record
      const tardyCount = selectedStudent.totalTardiness || 0;
      let defaultSubject = 'مناقشة المستوى السلوكي والدراسي للطالب ووضع خطة دعم مشتركة';

      if (tardyCount >= 3) {
        defaultSubject = `تكرار التأخر الصباحي عن الطابور المدرسي (${tardyCount} مرات مسجلة)`;
      } else if (selectedStudent.status === 'متابع سلوكيًا' || (selectedStudent.totalViolations || 0) > 0) {
        defaultSubject = 'ارتكاب مخالفة سلوكية تستوجب حضور ولي الأمر للمقابلة العاجلة';
      }

      setSubject((prev) => (prev ? prev : defaultSubject));
      setFormId(`summon-${Date.now()}`);
      setStudentSignature(null);
      setStudentSignatureDate(todayStr);
    }
  }, [selectedStudent, todayStr]);

  // Pre-selected student ID effect
  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId);
      setActiveViewMode('editor');
    }
  }, [preselectedStudentId]);

  // Handle date change and update day name automatically
  const handleDateChange = (newDate: string) => {
    setSummonDate(newDate);
    setSummonDay(getDayNameInArabic(newDate));
  };

  // Filter students for search dropdown
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.includes(q) ||
        s.grade.includes(q) ||
        s.section.includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [students, searchQuery]);

  // Quick preset subjects
  const subjectPresets = [
    {
      title: 'تكرار التأخر الصباحي',
      text: selectedStudent
        ? `تكرار التأخر الصباحي عن الطابور المدرسي (مسجل ${selectedStudent.totalTardiness || 0} مرات تأخير)`
        : 'تكرار التأخر الصباحي عن الطابور المدرسي دون عذر مقبول',
    },
    {
      title: 'مخالفة سلوكية تستوجب المقابلة',
      text: 'ارتكاب مخالفة سلوكية تستوجب استدعاء ولي الأمر والاطلاع على الإجراءات التربوية',
    },
    {
      title: 'مناقشة الخطة السلوكية والدراسية',
      text: 'مناقشة المستوى السلوكي والدراسي للطالب ووضع خطة علاجية مشتركة لرفع كفاءته',
    },
    {
      title: 'حيازة الهاتف المتحرك داخل المدرسة',
      text: 'حيازة واستخدام الهاتف المتحرك داخل الحرم المدرسي بالمخالفة للائحة السلوك الطلابي',
    },
    {
      title: 'إشعار متابعة بعد إنذار خطي',
      text: 'متابعة التزام الطالب بعد استلامه نموذج التنبيه الخطي والتعهد السلوكي',
    },
  ];

  // Current Form Object built in real-time
  const currentFormRecord: ParentSummonFormRecord = useMemo(() => {
    return {
      id: formId || `summon-${Date.now()}`,
      studentId: selectedStudent?.id || '',
      studentNumber: selectedStudent?.studentNumber || '',
      studentName: selectedStudent?.fullName || '',
      grade: selectedStudent?.grade || 'تاسع',
      section: selectedStudent?.section || '1',
      parentName: selectedStudent?.parentName || `ولي أمر الطالب ${selectedStudent?.fullName || ''}`,
      parentPhone: selectedStudent?.parentPhone || '',
      parentRelation: selectedStudent?.parentRelation || 'ولي الأمر',
      emirate,
      council,
      sector,
      school,
      summonDay,
      summonDate,
      summonTime,
      subject,
      principalName,
      principalDate,
      studentSignature: studentSignature || undefined,
      studentSignatureDate: studentSignature ? studentSignatureDate : undefined,
      status: studentSignature ? 'تم الاستلام والتوقيع' : 'مسودة',
      recordedBy: currentUser?.name || 'إدارة المدرسة',
      createdAt: todayStr,
      updatedAt: todayStr,
    };
  }, [
    formId,
    selectedStudent,
    emirate,
    council,
    sector,
    school,
    summonDay,
    summonDate,
    summonTime,
    subject,
    principalName,
    principalDate,
    studentSignature,
    studentSignatureDate,
    currentUser,
    todayStr,
  ]);

  // Save Form Handler
  const handleSaveForm = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      await onSaveForm(currentFormRecord);
      setSaveSuccessMessage('تم حفظ خطاب الاستدعاء وتوثيقه بنجاح في سجلات المدرسة والملف الطلابي!');
      setTimeout(() => setSaveSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Error saving summon form:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Direct Print
  const handleOpenPrint = () => {
    setActiveFormToPrint(currentFormRecord);
    setPrintModalOpen(true);
  };

  // Open WhatsApp Link for parent
  const handleSendWhatsApp = () => {
    if (!selectedStudent?.parentPhone) {
      alert('لا يتوفر رقم هاتف مسجل لولي الأمر.');
      return;
    }
    const cleanPhone = selectedStudent.parentPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('971')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `971${cleanPhone.substring(1)}`
      : `971${cleanPhone}`;

    const text = `المكرم ولي أمر الطالب: ${selectedStudent.fullName} المحترم (${school})\nالسلام عليكم ورحمة الله وبركاته،\nنرجو منكم الحضور إلى المدرسة في يوم ${summonDay} الموافق ${summonDate} لمقابلة إدارة المدرسة لموضوع يتعلق بإبنكم: (${subject}).\nشاكرين لكم حسن تعاونكم الدائم.`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Reset form
  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة ضبط النموذج لبيانات الطالب الافتراضية؟')) {
      setFormId(`summon-${Date.now()}`);
      setSummonDate(tomorrowStr);
      setSummonDay(getDayNameInArabic(tomorrowStr));
      setStudentSignature(null);
      setSubject('مناقشة المستوى السلوكي والدراسي للطالب ووضع خطة دعم مشتركة');
    }
  };

  // Load an existing form from history into editor
  const handleLoadFormFromHistory = (f: ParentSummonFormRecord) => {
    setSelectedStudentId(f.studentId);
    setFormId(f.id);
    setEmirate(f.emirate);
    setCouncil(f.council);
    setSector(f.sector);
    setSchool(f.school);
    setSummonDate(f.summonDate);
    setSummonDay(f.summonDay);
    setSummonTime(f.summonTime || '08:30 صباحاً');
    setSubject(f.subject);
    setPrincipalName(f.principalName);
    setPrincipalDate(f.principalDate);
    setStudentSignature(f.studentSignature || null);
    setStudentSignatureDate(f.studentSignatureDate || todayStr);
    setActiveViewMode('editor');
  };

  // Filter history
  const filteredForms = useMemo(() => {
    if (!historySearchQuery.trim()) return forms;
    const q = historySearchQuery.toLowerCase().trim();
    return forms.filter(
      (f) =>
        f.studentName.toLowerCase().includes(q) ||
        f.studentNumber.includes(q) ||
        f.subject.toLowerCase().includes(q) ||
        f.summonDate.includes(q)
    );
  }, [forms, historySearchQuery]);

  const { day, month, year } = getFormattedDateParts(summonDate);

  return (
    <div className="space-y-6">
      {/* Sub-navigation & Mode Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0C2340] text-[#D4AF37] rounded-xl shadow-xs">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                خطاب استدعاء ولي الأمر (نموذج رقم 8)
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                ملحق (8) القرار الوزاري 851 لسنة 2018
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تعبئة تلقائية لكافة البيانات المدرسية، مع توقيع الطالب بالاستلام ومعاينة رسمية مطابقة للأصل الوزاري
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            id="btn-mode-editor"
            onClick={() => setActiveViewMode('editor')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeViewMode === 'editor'
                ? 'bg-[#0C2340] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSignature className="w-4 h-4 text-[#D4AF37]" />
            <span>تحرير النموذج والتوقيع</span>
          </button>

          <button
            type="button"
            id="btn-mode-archive"
            onClick={() => setActiveViewMode('archive')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeViewMode === 'archive'
                ? 'bg-[#0C2340] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-4 h-4 text-[#D4AF37]" />
            <span>سجل الخطابات الصادرة</span>
            {forms.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[10px] font-mono">
                {forms.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* VIEW MODE: ARCHIVE / HISTORY */}
      {activeViewMode === 'archive' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">
                سجل خطابات استدعاء أولياء الأمور الصادرة ({forms.length})
              </h4>
              <p className="text-xs text-slate-500">
                أرشيف معتمد لجميع خطابات نموذج (8) الصادرة مع إمكانية إعادة الطباعة أو التدقيق
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث بالطالب، الرقم أو الموضوع..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
              />
            </div>
          </div>

          {filteredForms.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileSignature className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-xs font-medium">لم يتم العثور على خطابات استدعاء مطابقة.</p>
              <button
                type="button"
                onClick={() => setActiveViewMode('editor')}
                className="mt-3 px-4 py-2 bg-[#006D77] text-white rounded-xl text-xs font-bold hover:bg-[#005a63] cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>تحرير خطاب استدعاء جديد</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">الطالب</th>
                    <th className="p-3">الصف / الشعبة</th>
                    <th className="p-3">موضوع الاستدعاء</th>
                    <th className="p-3">يوم وتاريخ المقابلة</th>
                    <th className="p-3">توقيع الطالب</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredForms.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{f.studentName}</div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {f.studentNumber}
                        </span>
                      </td>
                      <td className="p-3">
                        الصف {f.grade} {f.section ? `(شعبـة ${f.section})` : ''}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={f.subject}>
                        {f.subject}
                      </td>
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-800">{f.summonDay}</span>{' '}
                        <span className="text-slate-500 text-[11px]">{f.summonDate}</span>
                      </td>
                      <td className="p-3">
                        {f.studentSignature ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            موقّع ومستلم
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            بانتظار التوقيع
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            f.status === 'تم الاستلام والتوقيع'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFormToPrint(f);
                              setPrintModalOpen(true);
                            }}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="طباعة الخطاب A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadFormFromHistory(f)}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="تعديل أو استكمال التوقيع"
                          >
                            <FileSignature className="w-4 h-4" />
                          </button>

                          {onDeleteForm && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من حذف خطاب الاستدعاء الخاص بالطالب ${f.studentName}؟`
                                  )
                                ) {
                                  onDeleteForm(f.id, f.studentName);
                                }
                              }}
                              className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="حذف الخطاب"
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
      )}

      {/* VIEW MODE: EDITOR & LIVE SIGNATURE */}
      {activeViewMode === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Column: Form Controls and Auto-Filled Data (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Student Selection Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#006D77]" />
                  <h4 className="text-xs font-black text-slate-900">
                    ١. اختيار الطالب (تعبئة تلقائية فورية للبيانات)
                  </h4>
                </div>
                {selectedStudent && (
                  <span className="text-[11px] font-mono text-slate-500">
                    الرقم الطلابي: <strong className="text-slate-800">{selectedStudent.studentNumber}</strong>
                  </span>
                )}
              </div>

              {/* Student Search & Select Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ابحث باسم الطالب، الرقم الطلابي، الصف أو ولي الأمر..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
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

                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  {filteredStudents.map((s) => {
                    const isSelected = s.id === selectedStudentId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchQuery('');
                        }}
                        className={`w-full text-right p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-white text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-[#006D77]' : 'bg-slate-300'
                            }`}
                          />
                          <div>
                            <span className="font-bold">{s.fullName}</span>
                            <span className="text-slate-400 text-[11px] font-mono mr-2">
                              ({s.studentNumber})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>الصف {s.grade}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">
                            {s.totalTardiness || 0} تأخير
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-filled Summary Card */}
              {selectedStudent && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ولي الأمر (تلقائي)</span>
                    <strong className="text-slate-800">
                      {selectedStudent.parentName || 'ولي أمر الطالب'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">رقم هاتف التواصل</span>
                    <strong className="text-slate-800 font-mono">
                      {selectedStudent.parentPhone || 'غير مسجل'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">الصف والشعبة (تلقائي)</span>
                    <strong className="text-slate-800">
                      الصف {selectedStudent.grade} / {selectedStudent.section}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Ministry Institutional Header Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#006D77]" />
                <h4 className="text-xs font-black text-slate-900">
                  ٢. بيانات الهيكل المدرسي (أعلى النموذج الرسمي - ملحق 8)
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">الإمارة</label>
                  <input
                    type="text"
                    value={emirate}
                    onChange={(e) => setEmirate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">المجلس</label>
                  <input
                    type="text"
                    value={council}
                    onChange={(e) => setCouncil(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">النطاق</label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">المدرسة</label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Date, Time & Reason for Summon */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#006D77]" />
                <h4 className="text-xs font-black text-slate-900">
                  ٣. موعد المقابلة وموضوع الاستدعاء
                </h4>
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">تحديد سريع للموعد:</span>
                <button
                  type="button"
                  onClick={() => handleDateChange(todayStr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    summonDate === todayStr
                      ? 'bg-[#0C2340] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  اليوم ({getDayNameInArabic(todayStr)})
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(tomorrowStr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    summonDate === tomorrowStr
                      ? 'bg-[#0C2340] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  غداً ({getDayNameInArabic(tomorrowStr)})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    تاريخ الحضور المطلوب
                  </label>
                  <input
                    type="date"
                    value={summonDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    يوم الحضور (يكتب تلقائياً)
                  </label>
                  <input
                    type="text"
                    value={summonDay}
                    onChange={(e) => setSummonDay(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    وقت الحضور المتوقع
                  </label>
                  <input
                    type="text"
                    value={summonTime}
                    onChange={(e) => setSummonTime(e.target.value)}
                    placeholder="مثال: 08:30 صباحاً"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Summon Subject Presets */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold text-xs">
                    لموضوع يتعلق بإبنكم / إبنتكم (نص موضوع الاستدعاء):
                  </label>
                  <span className="text-[11px] text-[#006D77] font-medium">اقتراحات سريعة بنقرة:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {subjectPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSubject(preset.text)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-lg text-[11px] font-medium transition-all text-slate-700 cursor-pointer text-right"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="اكتب سبب وموضوع الاستدعاء أو اختر من الاقتراحات أعلاه..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Principal Details */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    اسم مدير/ة المدرسة (جهة التحرير)
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    تاريخ تحرير الخطاب
                  </label>
                  <input
                    type="date"
                    value={principalDate}
                    onChange={(e) => setPrincipalDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: STUDENT RECEIPT SIGNATURE (توقيع الطالب بالاستلام) */}
            <div className="bg-white p-5 rounded-2xl border-2 border-[#006D77]/40 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-[#006D77]" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      ٤. توقيع الطالب/الطالبة على الاستلام (المطلوب في النموذج)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      يوقع الطالب إلكترونياً باللمس أو الماوس لإقرار استلام خطاب استدعاء ولي أمره
                    </p>
                  </div>
                </div>

                {studentSignature ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    تم توثيق استلام الطالب بنجاح
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-bold border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    بانتظار توقيع الطالب
                  </span>
                )}
              </div>

              {/* Student info for receipt */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-slate-500 text-[11px] block">اسم الطالب المستلم (يكتب تلقائياً):</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {selectedStudent?.fullName || '—'}
                  </strong>
                </div>

                <div className="space-y-0.5 text-left">
                  <span className="text-slate-500 text-[11px] block">تاريخ الاستلام:</span>
                  <strong className="text-slate-900 font-mono text-xs">{studentSignatureDate}</strong>
                </div>
              </div>

              {/* Interactive Signature Pad */}
              <div>
                <SignatureCanvas
                  title={`لوحة توقيع الطالب: ${selectedStudent?.fullName || ''}`}
                  onSave={(dataUrl) => {
                    setStudentSignature(dataUrl);
                    setStudentSignatureDate(todayStr);
                  }}
                  onClear={() => {
                    setStudentSignature(null);
                  }}
                  existingSignature={studentSignature || undefined}
                />
              </div>
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-20 border-2 border-[#D4AF37]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-save-summon-form"
                  onClick={handleSaveForm}
                  disabled={isSaving || !selectedStudent}
                  className="px-5 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isSaving ? 'جارٍ الحفظ والتوثيق...' : 'حفظ واعتماد النموذج (8)'}</span>
                </button>

                <button
                  type="button"
                  id="btn-print-summon-preview"
                  onClick={handleOpenPrint}
                  disabled={!selectedStudent}
                  className="px-4 py-2.5 bg-[#0C2340] hover:bg-[#15345d] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 border border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>معاينة وطباعة A4 / PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={!selectedStudent?.parentPhone}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="إرسال إشعار فوري لولي الأمر عبر WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>إشعار WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  title="إعادة ضبط الحقول"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Left Column: Live Sheet Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#006D77]" />
                <span>معاينة ورقة النموذج الرسمي المباشرة</span>
              </span>
              <button
                type="button"
                onClick={handleOpenPrint}
                className="text-[11px] text-[#006D77] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>فتح وضع الطباعة</span>
              </button>
            </div>

            {/* Simulated Sheet Box */}
            <div
              className="bg-white rounded-xl border border-slate-300 shadow-md p-6 text-slate-900 text-right space-y-5 text-xs select-none"
              style={{
                fontFamily: "'Tajawal', 'Cairo', 'Arial', sans-serif",
                lineHeight: 1.8,
              }}
              dir="rtl"
            >
              {/* Header */}
              <div className="text-center border-b border-black pb-1">
                <p className="font-bold text-[10px] sm:text-[11px]">
                  ملحق (8) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
                </p>
              </div>

              {/* Right & Left Blocks */}
              <div className="flex justify-between items-start text-[11px]">
                <div className="space-y-0.5 leading-tight text-slate-800">
                  <p>
                    <span className="font-bold">إمارة:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-semibold">
                      {emirate}
                    </span>
                  </p>
                  <p className="font-bold">ادارة العمليات المدرسية /</p>
                  <p>
                    <span className="font-bold">المجلس:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-semibold">
                      {council}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold">نطاق:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-semibold">
                      {sector}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold">مدرسة:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-semibold">
                      {school}
                    </span>
                  </p>
                </div>

                <div className="text-left font-bold text-xs bg-slate-100 px-2 py-0.5 rounded">
                  نموذج رقم (8)
                </div>
              </div>

              {/* Centered Document Title */}
              <div className="text-center py-1">
                <h5 className="font-black text-sm tracking-wide border-b-2 border-black inline-block pb-0.5">
                  خطاب استدعاء ولي الأمر
                </h5>
              </div>

              {/* Guardian & Student Section */}
              <div className="space-y-1.5 text-[11px]">
                <p>
                  <span className="font-bold">ولي أمر الطالب/الطالبة:</span>{' '}
                  <span className="border-b border-dotted border-black px-1 font-semibold text-slate-900">
                    {selectedStudent?.parentName || (selectedStudent ? `ولي أمر الطالب ${selectedStudent.fullName}` : '....................................................')}
                  </span>
                </p>
                <p>
                  <span className="font-bold">بالصف:</span>{' '}
                  <span className="border-b border-dotted border-black px-1 font-semibold text-slate-900">
                    {selectedStudent ? `الصف ${selectedStudent.grade} (شعبة ${selectedStudent.section})` : '....................................................'}
                  </span>
                </p>
              </div>

              <div className="font-bold text-[11px]">
                <p>السلام عليكم ورحمة الله وبركاته</p>
              </div>

              {/* Main Body */}
              <div className="space-y-2 text-[11px] leading-relaxed">
                <p>
                  الرجاء منكم الحضور إلى المدرسة في يوم{' '}
                  <span className="font-bold border-b border-dotted border-black px-1">
                    {summonDay}
                  </span>{' '}
                  الموافق{' '}
                  <span className="font-bold border-b border-dotted border-black px-1 font-mono">
                    {day} / {month} / {year}
                  </span>
                  م لمقابلة إدارة المدرسة لموضوع يتعلق بإبنكم / إبنتكم{' '}
                  <span className="font-semibold text-slate-900 border-b border-dotted border-black px-1 inline-block w-full mt-1">
                    {subject || '....................................................................'}
                  </span>
                </p>

                <p className="pt-1">
                  شاكرين لكم حسن تعاونكم وتجاوبكم معنا لتحقيق مصلحة الطالب/الطالبة.
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-200 text-[10px]">
                <div className="space-y-1">
                  <p className="font-black text-[11px]">مدير/ة المدرسة</p>
                  <p>
                    <span className="font-bold">الاسم:</span>{' '}
                    <span className="border-b border-dotted border-black px-1">
                      {principalName}
                    </span>
                  </p>
                  <p className="h-6 flex items-center">
                    <span className="font-bold">التوقيع:</span>{' '}
                    <span className="border-b border-dotted border-black inline-block w-24 h-4 mr-1"></span>
                  </p>
                  <p>
                    <span className="font-bold">التاريخ:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-mono">
                      {principalDate}
                    </span>
                  </p>
                </div>

                <div className="space-y-1 border-r border-slate-200 pr-2">
                  <p className="font-black text-[11px] text-slate-900">
                    توقيع الطالب/الطالبة على الاستلام
                  </p>
                  <p>
                    <span className="font-bold">الاسم:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-semibold">
                      {selectedStudent?.fullName || '...........................'}
                    </span>
                  </p>
                  <div className="min-h-[28px] flex items-center">
                    <span className="font-bold">التوقيع:</span>
                    {studentSignature ? (
                      <img
                        src={studentSignature}
                        alt="توقيع الطالب"
                        className="h-7 object-contain mr-1 border border-emerald-300 rounded bg-emerald-50/50"
                      />
                    ) : (
                      <span className="border-b border-dotted border-black inline-block w-24 h-4 mr-1"></span>
                    )}
                  </div>
                  <p>
                    <span className="font-bold">التاريخ:</span>{' '}
                    <span className="border-b border-dotted border-black px-1 font-mono">
                      {studentSignature ? studentSignatureDate : '...../...../..........م'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      <PrintSummonModal
        isOpen={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setActiveFormToPrint(null);
        }}
        form={activeFormToPrint}
      />
    </div>
  );
};
