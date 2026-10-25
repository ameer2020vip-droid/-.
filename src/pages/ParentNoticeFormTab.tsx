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
  Sparkles,
  ShieldCheck,
  FileText,
  Lock,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  Student,
  ParentNoticeFormRecord,
  ParentNoticeType,
  ViolationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import {
  getUaeTodayDateString,
  getDayNameInArabic,
  getFormattedDateParts,
} from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintParentNoticeModal } from '../components/PrintParentNoticeModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface ParentNoticeFormTabProps {
  students: Student[];
  forms: ParentNoticeFormRecord[];
  violations?: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveForm: (form: ParentNoticeFormRecord) => Promise<void>;
  onDeleteForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  preselectedStudentId?: string | null;
  preselectedViolationId?: string | null;
  onOpenGradeSectionSearch?: () => void;
}

const NOTICE_TYPE_CONFIG: Record<
  ParentNoticeType,
  { label: string; badgeColor: string; icon: string; description: string }
> = {
  'تنبيه خطي': {
    label: 'تنبيه خطي',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100',
    icon: '📝',
    description: 'إشعار رسمي أولي يوجه لولي الأمر للمخالفات البسيطة أو المتكررة شفهياً',
  },
  تحذير: {
    label: 'تحذير',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    icon: '⚠️',
    description: 'تحذير واضح لولي الأمر بضرورة تدارك السلوك قبل تصعيد الإجراءات',
  },
  'إنذار أول': {
    label: 'إنذار أول',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100',
    icon: '🛑',
    description: 'إنذار رسمي من الدرجة الأولى يترتب عليه حسم درجات وتوثيق في الملف',
  },
  'إنذار ثاني': {
    label: 'إنذار ثاني',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    icon: '🚨',
    description: 'إنذار ثانٍ مشدد بسبب عدم الاستجابة أو تكرار مخالفات متوسطة وجسيمة',
  },
  'إنذار نهائي': {
    label: 'إنذار نهائي',
    badgeColor: 'bg-red-100 text-red-900 border-red-400 hover:bg-red-200',
    icon: '⛔',
    description: 'إنذار أخير وحاسم يسبق الإحالة إلى لجنة إدارة السلوك أو اتخاذ تدابير حاسمة',
  },
};

const COMMON_VIOLATION_PRESETS = [
  'إثارة الفوضى ومقاطعة سير الحصة الدراسية وعدم الامتثال لتعليمات المعلم.',
  'استخدام الهاتف المتحرك والأجهزة الإلكترونية أثناء الحصص دون إذن مسبق.',
  'التأخر المتكرر عن الطابور الصباحي والحصص الدراسية دون عذر مقبول.',
  'التلفظ بعبارات غير لائقة تجاه الزملاء وعدم الالتزام بالاحترام المتبادل.',
  'الخروج من الفصل الدراسي أو التجول في الممرات أثناء الحصص دون استئذان.',
  'عدم الالتزام بالزي المدرسي المعتمد والمظهر اللائق وفق لائحة السلوك.',
  'إلحاق ضرر متعمد بالمرافق أو الأثاث المدرسي وممتلكات المدرسة.',
  'التنمر أو مضايقة الطلاب سواء لفظياً أو جسدياً داخل الحرم المدرسي.',
];

export const ParentNoticeFormTab: React.FC<ParentNoticeFormTabProps> = ({
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
  const todayStr = getUaeTodayDateString();

  // Mode: editor or archive
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'archive'>('editor');

  // Form Fields
  const [formId, setFormId] = useState<string>(`PN-${Date.now()}`);
  const [noticeType, setNoticeType] = useState<ParentNoticeType>('تنبيه خطي');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId || '');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [linkedViolationId, setLinkedViolationId] = useState<string>(preselectedViolationId || '');

  const { schoolSettings } = useSchoolSettings();

  // Institutional Info
  const [emirate, setEmirate] = useState(schoolSettings.emirate || 'دبي');
  const [operationsManagement, setOperationsManagement] = useState('إدارة العمليات المدرسية');
  const [council, setCouncil] = useState('مجلس 1');
  const [sector, setSector] = useState('نطاق 2');
  const [schoolName, setSchoolName] = useState(
    currentUser?.schoolName || schoolSettings.schoolName
  );

  // Incident Details
  const [incidentDate, setIncidentDate] = useState<string>(todayStr);
  const [incidentDay, setIncidentDay] = useState<string>(getDayNameInArabic(todayStr));
  const [violationDetails, setViolationDetails] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(todayStr);

  // Signatures
  const [officerName, setOfficerName] = useState<string>(currentUser?.name || 'المرشد الأكاديمي');
  const [officerSignature, setOfficerSignature] = useState<string | null>(null);
  const [officerSignatureDate, setOfficerSignatureDate] = useState<string>(todayStr);

  const [principalName, setPrincipalName] = useState<string>(
    schoolSettings.principalName || 'مدير المدرسة'
  );
  const [principalSignature, setPrincipalSignature] = useState<string | null>(null);
  const [principalSignatureDate, setPrincipalSignatureDate] = useState<string>(todayStr);

  const [studentSignature, setStudentSignature] = useState<string | null>(null);
  const [studentSignatureDate, setStudentSignatureDate] = useState<string>(todayStr);

  const [parentSignature, setParentSignature] = useState<string | null>(null);
  const [parentSignatureDate, setParentSignatureDate] = useState<string>('');

  const [status, setStatus] = useState<'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم'>('بانتظار التوقيع');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [activeFormToPrint, setActiveFormToPrint] = useState<ParentNoticeFormRecord | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<string>('all');

  // Find selected student
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId || s.studentNumber === selectedStudentId);
  }, [students, selectedStudentId]);

  // Student's existing violations for quick linking
  const studentViolations = useMemo(() => {
    if (!selectedStudentId) return [];
    return violations.filter(
      (v) => v.studentId === selectedStudentId || v.studentNumber === selectedStudent?.studentNumber
    );
  }, [violations, selectedStudentId, selectedStudent]);

  // Pre-selected ID listeners
  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId);
      setActiveViewMode('editor');
    }
  }, [preselectedStudentId]);

  useEffect(() => {
    if (preselectedViolationId && violations.length > 0) {
      const v = violations.find((item) => item.id === preselectedViolationId);
      if (v) {
        setLinkedViolationId(v.id);
        setSelectedStudentId(v.studentId);
        setViolationDetails(v.incidentDescription || v.violationType);
        if (v.incidentDateTime) {
          const dateOnly = v.incidentDateTime.split(' ')[0];
          if (dateOnly && dateOnly.includes('-')) {
            setIncidentDate(dateOnly);
            setIncidentDay(getDayNameInArabic(dateOnly));
          }
        }
      }
    }
  }, [preselectedViolationId, violations]);

  // When date changes, automatically update Arabic day name
  const handleDateChange = (newDate: string) => {
    setIncidentDate(newDate);
    setIncidentDay(getDayNameInArabic(newDate));
  };

  // When student changes, auto-fill
  useEffect(() => {
    if (selectedStudent) {
      // Suggest notice type based on violation/tardiness history
      const violCount = selectedStudent.totalViolations || 0;
      if (violCount >= 3) {
        setNoticeType('إنذار ثانٍ' as ParentNoticeType);
      } else if (violCount === 2) {
        setNoticeType('إنذار أول');
      } else if (violCount === 1) {
        setNoticeType('تحذير');
      } else {
        setNoticeType('تنبيه خطي');
      }
    }
  }, [selectedStudent]);

  // Filter students for search dropdown
  const filteredStudents = useMemo(() => {
    if (!searchStudentQuery.trim()) return students.slice(0, 12);
    const q = searchStudentQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.includes(q) ||
        s.grade.includes(q) ||
        s.section.includes(q)
    );
  }, [students, searchStudentQuery]);

  // Reset Form
  const handleReset = () => {
    setFormId(`PN-${Date.now()}`);
    setSelectedStudentId('');
    setLinkedViolationId('');
    setViolationDetails('');
    setNoticeType('تنبيه خطي');
    setIncidentDate(todayStr);
    setIncidentDay(getDayNameInArabic(todayStr));
    setOfficerSignature(null);
    setPrincipalSignature(null);
    setStudentSignature(null);
    setParentSignature(null);
    setStatus('بانتظار التوقيع');
    onShowToast('تم تفريغ حقول النموذج للبدء بإخطار جديد', 'info');
  };

  // Load an existing record into editor
  const handleEditRecord = (rec: ParentNoticeFormRecord) => {
    setFormId(rec.id);
    setNoticeType(rec.noticeType);
    setSelectedStudentId(rec.studentId);
    setEmirate(rec.emirate || 'الشارقة');
    setOperationsManagement(rec.operationsManagement || 'إدارة العمليات المدرسية الأولى');
    setCouncil(rec.council || 'مجلس 1');
    setSector(rec.sector || 'نطاق 2');
    setSchoolName(rec.schoolName || schoolName);
    setIncidentDate(rec.incidentDate);
    setIncidentDay(rec.incidentDay || getDayNameInArabic(rec.incidentDate));
    setViolationDetails(rec.violationDetails);
    setLinkedViolationId(rec.violationId || '');
    setOfficerName(rec.officerName || officerName);
    setOfficerSignature(rec.officerSignature || null);
    setPrincipalName(rec.principalName || principalName);
    setPrincipalSignature(rec.principalSignature || null);
    setStudentSignature(rec.studentSignature || null);
    setParentSignature(rec.parentSignature || null);
    setIssueDate(rec.issueDate || todayStr);
    setStatus(rec.status);
    setActiveViewMode('editor');
    onShowToast(`تم تحميل النموذج رقم (7) للطالب: ${rec.studentName}`, 'info');
  };

  // Build current record object
  const currentRecord: ParentNoticeFormRecord = useMemo(() => {
    return {
      id: formId,
      formType: 'parent_notice_form',
      formNumber: 7,
      noticeType,
      schoolId: currentUser?.schoolId || 'alkhalil-school',
      emirate,
      operationsManagement,
      council,
      sector,
      schoolName,
      studentId: selectedStudent?.id || selectedStudentId,
      studentNumber: selectedStudent?.studentNumber || '',
      studentName: selectedStudent?.fullName || '',
      grade: selectedStudent?.grade || 'العاشر',
      section: selectedStudent?.section || '1',
      parentName: selectedStudent?.parentName || '',
      parentPhone: selectedStudent?.parentPhone || '',
      incidentDay,
      incidentDate,
      violationDetails,
      violationId: linkedViolationId || undefined,
      officerName,
      officerSignature: officerSignature || undefined,
      officerSignatureDate,
      principalName,
      principalSignature: principalSignature || undefined,
      principalSignatureDate,
      studentSignature: studentSignature || undefined,
      studentSignatureDate: studentSignature ? studentSignatureDate : undefined,
      parentSignature: parentSignature || undefined,
      parentSignatureDate: parentSignature ? parentSignatureDate : undefined,
      issueDate,
      status,
      createdBy: currentUser?.name || 'المرشد الطلابي',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    formId,
    noticeType,
    currentUser,
    emirate,
    operationsManagement,
    council,
    sector,
    schoolName,
    selectedStudent,
    selectedStudentId,
    incidentDay,
    incidentDate,
    violationDetails,
    linkedViolationId,
    officerName,
    officerSignature,
    officerSignatureDate,
    principalName,
    principalSignature,
    principalSignatureDate,
    studentSignature,
    studentSignatureDate,
    parentSignature,
    parentSignatureDate,
    issueDate,
    status,
  ]);

  // Save Form Handler
  const handleSave = async (markApproved = false) => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً قبل حفظ النموذج', 'warning');
      return;
    }

    if (!violationDetails.trim()) {
      onShowToast('يرجى كتابة تفاصيل المخالفة السلوكية الصادرة عن الطالب', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const formToSave: ParentNoticeFormRecord = {
        ...currentRecord,
        status: markApproved ? 'معتمد ومسلّم' : (studentSignature ? 'معتمد ومسلّم' : 'بانتظار التوقيع'),
        isLocked: markApproved || Boolean(studentSignature && officerSignature),
      };

      await onSaveForm(formToSave);
      onShowToast(
        markApproved
          ? `تم اعتماد وتوثيق ${noticeType} (نموذج 7) للطالب ${selectedStudent.fullName} بنجاح!`
          : `تم حفظ ${noticeType} (نموذج 7) بنجاح!`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      onShowToast(`حدث خطأ أثناء حفظ النموذج: ${err.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    if (!selectedStudent) return '';
    const phone = selectedStudent.parentPhone || '';
    const text = `السلام عليكم ورحمة الله وبركاته،
السيد ولي أمر الطالب: ${selectedStudent.fullName} المحترم (${selectedStudent.grade} / ${selectedStudent.section})
مدرسة: ${schoolName}

إفادة رسمية: ${noticeType} لولي الأمر - نموذج رقم (7)
وفقاً للقرار الوزاري رقم (851) لسنة 2018 بشأن لائحة إدارة سلوك الطلبة.

حيث إنه في يوم ${incidentDay} الموافق ${incidentDate} م، صدر عن الطالب مخالفة سلوكية تمثلت في:
"${violationDetails}"

نرجو من سعادتكم التكرم بمتابعة الطالب وحثه على الالتزام باللوائح المدرسية لمنع تكرار مثل هذا السلوك وتجنب تطبيق إجراءات لائحة السلوك الأشد.

شاكرين لكم حسن تعاونكم الدائم في مصلحة الطالب.
إدارة ${schoolName || schoolSettings.schoolName}`;
    return { phone, text };
  };

  const handleOpenWhatsApp = () => {
    const data = generateWhatsAppMessage();
    if (!data) {
      onShowToast('يرجى اختيار طالب أولاً لإنشاء الرسالة', 'warning');
      return;
    }
    const cleanPhone = data.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(data.text)}`;
    window.open(url, '_blank');
    onShowToast('تم تجهيز وإرسال نص الإشعار عبر الواتساب', 'success');
  };

  // Print Preview
  const handleTriggerPrint = () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار طالب قبل فتح معاينة الطباعة', 'warning');
      return;
    }
    setActiveFormToPrint(currentRecord);
    setPrintModalOpen(true);
  };

  // Archive filtered
  const filteredArchive = useMemo(() => {
    return forms.filter((f) => {
      const matchSearch =
        archiveSearch.trim() === '' ||
        f.studentName.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        f.studentNumber.includes(archiveSearch) ||
        f.violationDetails.toLowerCase().includes(archiveSearch.toLowerCase());
      const matchType = archiveTypeFilter === 'all' || f.noticeType === archiveTypeFilter;
      return matchSearch && matchType;
    });
  }, [forms, archiveSearch, archiveTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0C2340] via-[#123356] to-[#006D77] text-white p-5 sm:p-6 rounded-2xl shadow-md border-b-4 border-[#D4AF37] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#D4AF37] text-black font-black text-xs px-2.5 py-0.5 rounded-md">
              نموذج رقم ( 7 )
            </span>
            <span className="text-slate-200 text-xs font-semibold">
              ملحق (7) للقرار الوزاري رقم (851) لسنة 2018م – لائحة إدارة سلوك الطلبة
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            تنبيه خطي / تحذير / إنذار أول / إنذار ثاني / إنذار نهائي إلى ولي الأمر
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            النموذج الوزاري الرسمي الموجه لولي أمر الطالب لإخطاره بالمخالفة السلوكية المرتكبة وحثه على المتابعة وتوقيع الإقرار بالعلم.
          </p>
        </div>

        {/* View Switcher: Editor vs Archive */}
        <div className="flex items-center gap-2 bg-black/25 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveViewMode('editor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewMode === 'editor'
                ? 'bg-[#006D77] text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>تحرير النموذج</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('archive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewMode === 'archive'
                ? 'bg-[#006D77] text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل النماذج الصادرة ({forms.length})</span>
          </button>
        </div>
      </div>

      {activeViewMode === 'archive' ? (
        /* ARCHIVE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#006D77]" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                أرشيف إخطارات وتنبيهات أولياء الأمور (نموذج رقم 7)
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الطالب أو المخالفة..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              <select
                value={archiveTypeFilter}
                onChange={(e) => setArchiveTypeFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="all">كافة أنواع التنبيهات والإنذارات</option>
                <option value="تنبيه خطي">تنبيه خطي</option>
                <option value="تحذير">تحذير</option>
                <option value="إنذار أول">إنذار أول</option>
                <option value="إنذار ثاني">إنذار ثاني</option>
                <option value="إنذار نهائي">إنذار نهائي</option>
              </select>
            </div>
          </div>

          {filteredArchive.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">لا توجد نماذج محفوظة حتى الآن</p>
              <p className="text-xs text-slate-400">انتقل لتبويب "تحرير النموذج" لإصدار إخطار جديد لولي الأمر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">رقم النموذج</th>
                    <th className="py-3 px-3">اسم الطالب</th>
                    <th className="py-3 px-3">الصف / الشعبة</th>
                    <th className="py-3 px-3">نوع الإخطار</th>
                    <th className="py-3 px-3">تاريخ الواقعة</th>
                    <th className="py-3 px-3">المخالفة المرتكبة</th>
                    <th className="py-3 px-3">التوقيعات</th>
                    <th className="py-3 px-3">الحالة</th>
                    <th className="py-3 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArchive.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{item.id}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.studentName}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.grade} / {item.section}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            NOTICE_TYPE_CONFIG[item.noticeType]?.badgeColor || 'bg-slate-100'
                          }`}
                        >
                          {NOTICE_TYPE_CONFIG[item.noticeType]?.icon} {item.noticeType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {item.incidentDate} ({item.incidentDay})
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[220px] truncate" title={item.violationDetails}>
                        {item.violationDetails}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.studentSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                            title="توقيع الطالب"
                          >
                            الطالب {item.studentSignature ? '✓' : '✗'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.parentSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                            title="توقيع ولي الأمر"
                          >
                            الولي {item.parentSignature ? '✓' : '✗'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.status === 'معتمد ومسلّم'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFormToPrint(item);
                              setPrintModalOpen(true);
                            }}
                            className="p-1 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                            title="طباعة A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditRecord(item)}
                            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <FileSignature className="w-4 h-4" />
                          </button>
                          {onDeleteForm && item.status !== 'معتمد ومسلّم' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف النموذج رقم 7 للطالب: ${item.studentName}؟`)) {
                                  onDeleteForm(item.id, item.studentName);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="حذف المسودة"
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
      ) : (
        /* EDITOR VIEW */
        <div className="space-y-6">
          {/* STEP 1: NOTICE TYPE SELECTOR (تنبيه خطي / تحذير / إنذار أول / إنذار ثاني / إنذار نهائي) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#006D77]"></span>
                اختر نوع الإخطار الرسمي (وفق ملحق 7):
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {NOTICE_TYPE_CONFIG[noticeType]?.description}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(Object.keys(NOTICE_TYPE_CONFIG) as ParentNoticeType[]).map((type) => {
                const cfg = NOTICE_TYPE_CONFIG[type];
                const isSelected = noticeType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNoticeType(type)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? `${cfg.badgeColor} border-2 shadow-xs font-black ring-2 ring-[#006D77]/20`
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="text-xs">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SELECT STUDENT & INSTITUTIONAL DATA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Picker */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#006D77]" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">بيانات الطالب وولي الأمر</h3>
                    <p className="text-[11px] text-slate-500">
                      يتم تعبئة الاسم والصف والشعبة ورقم ولي الأمر تلقائياً بمجرد اختيار الطالب
                    </p>
                  </div>
                </div>

                {selectedStudent && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم اختيار الطالب
                  </span>
                )}
              </div>

              {/* Search dropdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم، الرقم الطلابي، أو الصف..."
                      value={searchStudentQuery}
                      onChange={(e) => setSearchStudentQuery(e.target.value)}
                      className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
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

                {/* Filtered chips for quick select */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                  {filteredStudents.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(st.id);
                        setSearchStudentQuery('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-right flex items-center gap-2 ${
                        selectedStudentId === st.id
                          ? 'bg-[#006D77] text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span>{st.fullName}</span>
                      <span className="text-[10px] opacity-75">
                        ({st.grade}/{st.section})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Student Card */}
              {selectedStudent ? (
                <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 p-4 rounded-xl border border-teal-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">اسم الطالب/الطالبة:</span>
                    <strong className="text-slate-900 font-bold">{selectedStudent.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">الصف والشعبة:</span>
                    <strong className="text-slate-900 font-bold">
                      {selectedStudent.grade} / {selectedStudent.section}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">الرقم الطلابي:</span>
                    <strong className="text-slate-900 font-mono">{selectedStudent.studentNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">هاتف ولي الأمر:</span>
                    <strong className="text-slate-900 font-mono text-emerald-800" dir="ltr">
                      {selectedStudent.parentPhone || '—'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>يرجى اختيار طالب من القائمة أعلاه لتفعيل الحقول وتعبئة النموذج</span>
                </div>
              )}
            </div>

            {/* Institutional Settings Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building className="w-4 h-4 text-[#006D77]" />
                <h4 className="font-bold text-slate-800">بيانات المدرسة والمجلس</h4>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">الإمارة</label>
                  <input
                    type="text"
                    value={emirate}
                    onChange={(e) => setEmirate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">إدارة العمليات المدرسية</label>
                  <input
                    type="text"
                    value={operationsManagement}
                    onChange={(e) => setOperationsManagement(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-0.5">المجلس</label>
                    <input
                      type="text"
                      value={council}
                      onChange={(e) => setCouncil(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-0.5">نطاق</label>
                    <input
                      type="text"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">اسم المدرسة</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: INCIDENT DETAILS & VIOLATION DESCRIPTION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#006D77]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  تفاصيل الواقعة والمخالفة السلوكية المرتكبة
                </h3>
              </div>

              {/* Link to existing violation if available */}
              {studentViolations.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">ربط بمخالفة مسجلة للطالب:</span>
                  <select
                    value={linkedViolationId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setLinkedViolationId(vId);
                      const matched = studentViolations.find((v) => v.id === vId);
                      if (matched) {
                        setViolationDetails(matched.incidentDescription || matched.violationType);
                        if (matched.incidentDateTime) {
                          const dateOnly = matched.incidentDateTime.split(' ')[0];
                          if (dateOnly && dateOnly.includes('-')) {
                            handleDateChange(dateOnly);
                          }
                        }
                      }
                    }}
                    className="text-xs py-1 px-2.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-900 font-semibold"
                  >
                    <option value="">-- اختر من مخالفات الطالب المسجلة --</option>
                    {studentViolations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.violationType} ({v.incidentDateTime.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date & Day inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  تاريخ الواقعة (الموافق)
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  اليوم (يكتب تلقائياً)
                </label>
                <input
                  type="text"
                  value={incidentDay}
                  onChange={(e) => setIncidentDay(e.target.value)}
                  placeholder="مثال: الثلاثاء"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  تاريخ تحرير النموذج
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Violation Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#006D77]" />
                اقتراحات سريعة لنص المخالفة (اضغط للتعبئة الفورية):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_VIOLATION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setViolationDetails(preset)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-lg text-[11px] font-medium transition-all text-slate-700 cursor-pointer text-right"
                  >
                    {preset.slice(0, 45)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Violation Details Textarea */}
            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">
                نص المخالفة: قد صــــــــدر عن الطالب المذكور / الطالبة المذكورة مخالفة سلوكية تمثلت في:
              </label>
              <textarea
                rows={3}
                value={violationDetails}
                onChange={(e) => setViolationDetails(e.target.value)}
                placeholder="اكتب هنا تفاصيل المخالفة السلوكية أو اختر من الاقتراحات السريعة أعلاه..."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Official Ministerial Legal Warning Text Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed space-y-1">
              <span className="font-bold text-slate-900 block">
                النص القانوني الملزم في نموذج (7):
              </span>
              <p className="italic text-[11px]">
                "ولما كان هذا السلوك يخالف اللوائح والنظم المدرسية، وما ورد في لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام؛ فإنه يتوجب عليكم الحرص على متابعة الطالب للحيلولة دون تكرار مثل هذا السلوك، وإلا فإن إدارة المدرسة سوف تضطر لاتخاذ إجراءات أخرى أشد في حال تكرار هذه المخالفة أو صدور سلوك غير مرغوب فيه مرة أخرى."
              </p>
            </div>
          </div>

          {/* STEP 4: SIGNATURES QUADRANT (توقيع الموظف المسؤول + مدير المدرسة + توقيع الطالب + توقيع ولي الأمر) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#006D77]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    التوقيعات الرقمية المعتمدة (نموذج 7)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    توقيع الموظف المسؤول، مدير المدرسة، توقيع الطالب بالعلم، وتوقيع ولي الأمر بالعلم
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-600">
                {studentSignature && officerSignature ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    مكتمل التوقيعات الأساسية
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    بانتظار استكمال التوقيعات
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Officer Signature */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    ١. توقيع الموظف المسؤول (محرر التنبيه)
                  </span>
                  {officerSignature ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      موقع ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      مطلوب
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[11px]">الاسم:</span>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                  />
                </div>
                <SignatureCanvas
                  id="officer-signature-model7"
                  title="توقيع الموظف المسؤول"
                  signerType="المسؤول الإداري"
                  initialSignature={officerSignature || undefined}
                  onSave={(dataUrl, dateStr) => {
                    setOfficerSignature(dataUrl);
                    setOfficerSignatureDate(dateStr);
                    onShowToast('تم حفظ توقيع الموظف المسؤول', 'success');
                  }}
                  onClear={() => setOfficerSignature(null)}
                />
              </div>

              {/* 2. Principal Signature */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    ٢. توقيع مدير المدرسة
                  </span>
                  {principalSignature ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      موقع ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      اختياري / عند الاعتماد
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[11px]">الاسم:</span>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                  />
                </div>
                <SignatureCanvas
                  id="principal-signature-model7"
                  title="توقيع مدير المدرسة"
                  signerType="المسؤول الإداري"
                  initialSignature={principalSignature || undefined}
                  onSave={(dataUrl, dateStr) => {
                    setPrincipalSignature(dataUrl);
                    setPrincipalSignatureDate(dateStr);
                    onShowToast('تم حفظ توقيع مدير المدرسة', 'success');
                  }}
                  onClear={() => setPrincipalSignature(null)}
                />
              </div>

              {/* 3. Student Signature */}
              <div className="p-4 rounded-xl border-2 border-teal-200 bg-teal-50/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    ٣. توقيع الطالب / الطالبة بالعلم
                  </span>
                  {studentSignature ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      تم توقيع الطالب بنجاح ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      بانتظار توقيع الطالب
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">
                  يوقع الطالب لإثبات استلامه التنبيه وإبلاغ ولي أمره رسمياً بالمخالفة المسجلة.
                </p>
                <SignatureCanvas
                  id="student-signature-model7"
                  title={`توقيع الطالب: ${selectedStudent?.fullName || ''}`}
                  signerType="طالب"
                  initialSignature={studentSignature || undefined}
                  onSave={(dataUrl, dateStr) => {
                    setStudentSignature(dataUrl);
                    setStudentSignatureDate(dateStr);
                    onShowToast('تم حفظ توقيع الطالب بالعلم', 'success');
                  }}
                  onClear={() => setStudentSignature(null)}
                />
              </div>

              {/* 4. Parent Signature */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    ٤. توقيع ولي أمر الطالب / الطالبة بالعلم
                  </span>
                  {parentSignature ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      تم توقيع ولي الأمر ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      عند المراجعة أو المقابلة
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>هاتف ولي الأمر: {selectedStudent?.parentPhone || '—'}</span>
                  <span>تحريراً في: {issueDate}</span>
                </div>
                <SignatureCanvas
                  id="parent-signature-model7"
                  title="توقيع ولي الأمر بالعلم"
                  signerType="ولي أمر"
                  initialSignature={parentSignature || undefined}
                  onSave={(dataUrl, dateStr) => {
                    setParentSignature(dataUrl);
                    setParentSignatureDate(dateStr);
                    onShowToast('تم حفظ توقيع ولي الأمر بالعلم', 'success');
                  }}
                  onClear={() => setParentSignature(null)}
                />
              </div>
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-20 border-2 border-[#D4AF37]">
            <div className="flex items-center gap-2">
              <span className="bg-[#D4AF37] text-black font-black text-xs px-2.5 py-1 rounded-md">
                نموذج 7
              </span>
              <div className="text-xs">
                <span className="font-bold block">
                  {selectedStudent ? `${selectedStudent.fullName} – ${noticeType}` : 'لم يتم اختيار طالب'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {studentSignature ? 'موقع من الطالب' : 'بانتظار توقيع الطالب'} | {status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Reset button */}
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="تفريغ الحقول"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تفريغ</span>
              </button>

              {/* WhatsApp notification button */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!selectedStudent}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="إرسال نص التنبيه لواتساب ولي الأمر"
              >
                <MessageSquare className="w-4 h-4" />
                <span>إرسال واتساب</span>
              </button>

              {/* Print A4 / PDF */}
              <button
                type="button"
                onClick={handleTriggerPrint}
                disabled={!selectedStudent}
                className="px-3.5 py-2 bg-[#0C2340] hover:bg-[#123356] border border-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <span>معاينة وطباعة A4</span>
              </button>

              {/* Save Draft */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving || !selectedStudent}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ مسودة</span>
              </button>

              {/* Approve & Issue officially */}
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving || !selectedStudent}
                className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer border border-teal-400"
              >
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>اعتماد وتوثيق رسمي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal Component */}
      <PrintParentNoticeModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        form={activeFormToPrint}
      />
    </div>
  );
};
