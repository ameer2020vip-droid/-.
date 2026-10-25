import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Save,
  Clock,
  User,
  Calendar,
  FileSignature,
  Trash2,
  Eye,
  Send,
  Lock,
  History,
  Paperclip,
  Plus,
  X,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Copy,
  AlertCircle,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Check,
  PenTool,
} from 'lucide-react';
import {
  Student,
  ViolationReportRecord,
  ViolationReportStatus,
  ViolationReportDegree,
  IncidentPlaceType,
  FormSignaturesGroup,
  FormAttachmentItem,
  CounselorUser,
  AppUser,
  ViolationRecord,
} from '../types';
import {
  getUaeTodayDateString,
  getUaeFullDateTimeString,
} from '../utils/time';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { PrintViolationReportModal } from '../components/PrintViolationReportModal';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface ViolationReportFormTabProps {
  students: Student[];
  reports: ViolationReportRecord[];
  violations: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  onSaveReport: (report: ViolationReportRecord) => Promise<void>;
  onDeleteReport?: (reportId: string, studentName?: string) => Promise<void>;
  preselectedStudentId?: string | null;
  preselectedViolationId?: string | null;
  onNavigateToMessages?: (studentId: string, textTemplate?: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onOpenGradeSectionSearch?: () => void;
}

const INCIDENT_PLACES: IncidentPlaceType[] = [
  'الصف',
  'الممر',
  'الساحة',
  'الحافلة',
  'المختبر',
  'الملعب',
  'خارج المدرسة أثناء نشاط رسمي',
  'مكان آخر',
];

const INCIDENT_SITUATIONS = [
  'الحصة الدراسية',
  'طابور الصباح',
  'الفسحة المدرسية',
  'أثناء الانتقال بين الحصص',
  'النشاط المدرسي / حصة الرياضة',
  'وقت الانصراف وركوب الحافلات',
  'أثناء الاختبارات',
  'أخرى (مخصص)',
];

const VIOLATION_LEVELS: { label: ViolationReportDegree; code: string; maxOccurrences: number }[] = [
  { label: 'الأولى – بسيطة', code: 'درجة أولى', maxOccurrences: 3 },
  { label: 'الثانية – متوسطة الخطورة', code: 'درجة ثانية', maxOccurrences: 2 },
  { label: 'الثالثة – خطيرة', code: 'درجة ثالثة', maxOccurrences: 1 },
  { label: 'الرابعة – شديدة الخطورة', code: 'درجة رابعة', maxOccurrences: 1 },
];

export const ViolationReportFormTab: React.FC<ViolationReportFormTabProps> = ({
  students,
  reports,
  violations,
  currentUser,
  onSaveReport,
  onDeleteReport,
  preselectedStudentId,
  preselectedViolationId,
  onNavigateToMessages,
  onShowToast,
  onOpenGradeSectionSearch,
}) => {
  const todayStr = getUaeTodayDateString();
  const isViewer = currentUser?.role === 'viewer';
  const canApprove =
    currentUser?.role === 'systemAdmin' ||
    currentUser?.role === 'schoolAdmin' ||
    currentUser?.role === 'counselor';
  const { schoolSettings } = useSchoolSettings();

  // Mode: 'editor' or 'archive'
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'archive'>('editor');

  // Search & Student Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || (students.length > 0 ? students[0].id : '')
  );

  // Form State
  const [reportId, setReportId] = useState<string>('');
  const [reportNumber, setReportNumber] = useState<string>('');
  const [status, setStatus] = useState<ViolationReportStatus>('مسودة');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isCorrectionVersion, setIsCorrectionVersion] = useState<boolean>(false);
  const [originalReportId, setOriginalReportId] = useState<string | undefined>(undefined);

  // Linked Violation ID (binds to existing violation without creating duplicates)
  const [linkedViolationId, setLinkedViolationId] = useState<string>('');

  // Official Form (6) Fields
  const [teacherName, setTeacherName] = useState<string>(
    currentUser?.fullName || currentUser?.displayName || ''
  );
  const [incidentDate, setIncidentDate] = useState<string>(todayStr);
  const [incidentSituation, setIncidentSituation] = useState<string>('الحصة الدراسية');
  const [customIncidentSituation, setCustomIncidentSituation] = useState<string>('');
  const [incidentPlace, setIncidentPlace] = useState<IncidentPlaceType | string>('الصف');
  const [customIncidentPlace, setCustomIncidentPlace] = useState<string>('');
  const [incidentTime, setIncidentTime] = useState<string>('08:30 صباحاً');

  // Descriptions & Action
  const [description, setDescription] = useState<string>('');
  const [immediateAction, setImmediateAction] = useState<string>('');

  // Classification (حسب لائحة سلوك الطلبة)
  const [violationName, setViolationName] = useState<string>('');
  const [violationLevel, setViolationLevel] = useState<ViolationReportDegree>('الأولى – بسيطة');
  const [occurrenceCount, setOccurrenceCount] = useState<number>(1);
  const [suggestedDeduction, setSuggestedDeduction] = useState<string>('');

  // Reporter & Administration Metadata
  const [reportedBy, setReportedBy] = useState<string>(
    currentUser?.fullName || currentUser?.displayName || ''
  );
  const [reporterRole, setReporterRole] = useState<string>(
    currentUser?.jobTitle || 'معلم المادة'
  );
  const [oracleNumber, setOracleNumber] = useState<string>(
    (currentUser as any)?.oracleNumber || ''
  );
  const [principalName, setPrincipalName] = useState<string>(
    schoolSettings.principalName || 'مدير المدرسة'
  );

  // Attachments & Signatures
  const [attachments, setAttachments] = useState<FormAttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [signatures, setSignatures] = useState<FormSignaturesGroup>({});
  const [electronicSignatureInfo, setElectronicSignatureInfo] = useState<{
    reportId: string;
    signerName: string;
    signerRole: string;
    oracleNumber?: string;
    signedAt: string;
    signatureImage?: string;
    verified: boolean;
  } | null>(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);

  // Print Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [activeReportToPrint, setActiveReportToPrint] = useState<ViolationReportRecord | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('all');

  // Current selected student
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId || s.studentNumber === selectedStudentId);
  }, [students, selectedStudentId]);

  // Existing violations of the selected student for 1-click auto-fill
  const studentExistingViolations = useMemo(() => {
    if (!selectedStudent) return [];
    return violations.filter(
      (v) =>
        v.studentId === selectedStudent.id ||
        (selectedStudent.studentNumber && v.studentNumber === selectedStudent.studentNumber)
    );
  }, [violations, selectedStudent]);

  // Map degree string from violation record to Form (6) Degree
  const mapDegreeStringToEnum = (degStr: string): ViolationReportDegree => {
    if (!degStr) return 'الأولى – بسيطة';
    if (degStr.includes('الرابعة') || degStr.includes('4')) return 'الرابعة – شديدة الخطورة';
    if (degStr.includes('الثالثة') || degStr.includes('3')) return 'الثالثة – خطيرة';
    if (degStr.includes('الثانية') || degStr.includes('2')) return 'الثانية – متوسطة الخطورة';
    return 'الأولى – بسيطة';
  };

  // Auto-fill from selected student's existing violation
  const handleAutoFillFromViolation = (v: ViolationRecord) => {
    setLinkedViolationId(v.id);
    setViolationName(v.violationType || '');
    setDescription(v.incidentDescription || '');
    setImmediateAction(v.suggestedAction || (v as any).actionTaken || '');
    setIncidentPlace(v.incidentLocation || 'الصف');

    if (v.reportingPerson) {
      setTeacherName(v.reportingPerson);
      setReportedBy(v.reportingPerson);
    }

    if (v.incidentDateTime) {
      const parts = v.incidentDateTime.split(' ');
      if (parts[0]) setIncidentDate(parts[0]);
      if (parts[1]) setIncidentTime(parts.slice(1).join(' '));
    }

    if ((v as any).period) {
      setIncidentSituation((v as any).period);
    }

    const mappedLevel = mapDegreeStringToEnum(v.violationDegree);
    setViolationLevel(mappedLevel);
    setOccurrenceCount(Number((v as any).occurrenceCount) || 1);

    if (v.totalDeductionMarks || (v as any).deductionPoints) {
      const pts = v.totalDeductionMarks || (v as any).deductionPoints;
      setSuggestedDeduction(`حسم ${pts} درجات`);
    }

    onShowToast(`تم سحب بيانات المخالفة (${v.violationType}) وربط التقرير بها تلقائياً دون تكرار`, 'success');
  };

  // Handle preselected violation on mount or props change
  useEffect(() => {
    if (preselectedViolationId) {
      const v = violations.find((item) => item.id === preselectedViolationId);
      if (v) {
        setSelectedStudentId(v.studentId);
        handleAutoFillFromViolation(v);
        setActiveViewMode('editor');
      }
    }
  }, [preselectedViolationId, violations]);

  // Preselected student effect
  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId);
      setActiveViewMode('editor');
    }
  }, [preselectedStudentId]);

  // Filter students for search dropdown
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.includes(q) ||
        `${s.grade}/${s.section}`.includes(q)
    );
  }, [students, searchQuery]);

  // Reset / fresh report
  const handleResetForm = () => {
    const schoolId = currentUser?.schoolId || 'alkhalil-school';
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newId = `VR-${schoolId}-${year}-${rand}`;
    setReportId(newId);
    setReportNumber(newId);
    setStatus('مسودة');
    setIsLocked(false);
    setIsCorrectionVersion(false);
    setOriginalReportId(undefined);
    setLinkedViolationId('');
    setTeacherName(currentUser?.fullName || currentUser?.displayName || '');
    setIncidentDate(todayStr);
    setIncidentTime('08:30 صباحاً');
    setIncidentSituation('الحصة الدراسية');
    setCustomIncidentSituation('');
    setIncidentPlace('الصف');
    setCustomIncidentPlace('');
    setDescription('');
    setImmediateAction('');
    setViolationName('');
    setViolationLevel('الأولى – بسيطة');
    setOccurrenceCount(1);
    setSuggestedDeduction('');
    setReportedBy(currentUser?.fullName || currentUser?.displayName || '');
    setReporterRole(currentUser?.jobTitle || 'معلم المادة');
    setOracleNumber((currentUser as any)?.oracleNumber || '');
    setPrincipalName(schoolSettings.principalName || 'مدير المدرسة');
    setAttachments([]);
    setSignatures({});
    setElectronicSignatureInfo(null);
  };

  // Load existing report for viewing or editing
  const handleLoadReport = (r: ViolationReportRecord) => {
    setReportId(r.id);
    setReportNumber(r.reportNumber || r.id);
    setSelectedStudentId(r.studentId);
    setStatus(r.status);
    setIsLocked(Boolean(r.isLocked || r.status === 'معتمد'));
    setIsCorrectionVersion(Boolean(r.isCorrectionVersion));
    setOriginalReportId(r.originalReportId);
    setLinkedViolationId(r.violationId || '');

    setTeacherName(r.teacherName || r.reportedBy || '');
    setIncidentDate(r.incidentDate || todayStr);
    setIncidentTime(r.incidentTime || '08:30 صباحاً');

    if (INCIDENT_SITUATIONS.includes(r.incidentSituation || '')) {
      setIncidentSituation(r.incidentSituation!);
      setCustomIncidentSituation('');
    } else if (r.incidentSituation) {
      setIncidentSituation('أخرى (مخصص)');
      setCustomIncidentSituation(r.incidentSituation);
    } else {
      setIncidentSituation('الحصة الدراسية');
    }

    if (INCIDENT_PLACES.includes(r.incidentPlace as IncidentPlaceType)) {
      setIncidentPlace(r.incidentPlace);
      setCustomIncidentPlace('');
    } else {
      setIncidentPlace('مكان آخر');
      setCustomIncidentPlace(r.incidentPlace || '');
    }

    setDescription(r.description || '');
    setImmediateAction(r.immediateAction || '');
    setViolationName(r.violationName || '');
    setViolationLevel(r.violationLevel || 'الأولى – بسيطة');
    setOccurrenceCount(Number(r.occurrenceCount) || 1);
    setSuggestedDeduction(r.suggestedDeduction || '');

    setReportedBy(r.reportedBy || '');
    setReporterRole(r.reporterRole || 'معلم المادة');
    setOracleNumber(r.oracleNumber || '');
    setPrincipalName(r.principalName || schoolSettings.principalName || 'مدير المدرسة');

    setAttachments(r.attachments || []);
    setSignatures(r.signatures || {});
    setElectronicSignatureInfo(r.electronicSignatureInfo || null);

    setActiveViewMode('editor');
  };

  // Create Correction Version from an Approved Report
  const handleCreateCorrectionVersion = (r: ViolationReportRecord) => {
    const schoolId = currentUser?.schoolId || 'alkhalil-school';
    const year = new Date().getFullYear();
    const corrId = `VR-${schoolId}-${year}-${Date.now().toString().slice(-4)}-CORR`;

    handleLoadReport(r);
    setReportId(corrId);
    setReportNumber(corrId);
    setStatus('مسودة');
    setIsLocked(false);
    setIsCorrectionVersion(true);
    setOriginalReportId(r.id);
    setElectronicSignatureInfo(null);
    setSignatures({});

    onShowToast('تم إنشاء مسودة نسخة تصحيحية، يمكنك تعديل البيانات وإعادة اعتمادها رسمياً', 'info');
  };

  // Build the complete record matching Form (6)
  const buildCurrentRecord = (targetStatus: ViolationReportStatus): ViolationReportRecord => {
    if (!selectedStudent) {
      throw new Error('يرجى اختيار طالب أولاً');
    }

    const schoolId = currentUser?.schoolId || 'alkhalil-school';
    const finalReportId =
      reportId || `VR-${schoolId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const finalPlace =
      incidentPlace === 'مكان آخر' ? customIncidentPlace.trim() || 'مكان آخر' : incidentPlace;

    const finalSituation =
      incidentSituation === 'أخرى (مخصص)'
        ? customIncidentSituation.trim() || 'موقف مخصص'
        : incidentSituation;

    return {
      id: finalReportId,
      reportNumber: reportNumber || finalReportId,
      formType: 'violation_report',
      formNumber: 6,
      schoolId,
      schoolName: currentUser?.schoolName || schoolSettings.schoolName,
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      track: selectedStudent.track,
      violationId: linkedViolationId || undefined,
      teacherName: teacherName || reportedBy,
      incidentDate,
      date: incidentDate,
      incidentSituation: finalSituation,
      incidentPlace: finalPlace,
      incidentTime,
      period: finalSituation,
      subject: 'عام',
      description,
      immediateAction,
      studentStatement: '',
      studentAdmitted: true,
      witnesses: '',
      witnessStatements: '',
      damageOrInjury: false,
      damageOrInjuryDetails: '',
      violationName: violationName || 'مخالفة سلوكية مسجلة',
      violationLevel,
      occurrenceCount,
      suggestedDeduction: suggestedDeduction || '',
      reportedBy: reportedBy || teacherName,
      reporterRole: reporterRole || 'معلم المادة',
      oracleNumber: oracleNumber || '',
      principalName: principalName || schoolSettings.principalName || 'مدير المدرسة',
      attachments,
      counselorNotes: '',
      signatures,
      electronicSignatureInfo: electronicSignatureInfo || undefined,
      status: targetStatus,
      academicYear: '2026–2027',
      term: 'الفصل الدراسي الحالي',
      isLocked: targetStatus === 'معتمد',
      isCorrectionVersion,
      originalReportId,
      createdBy: currentUser?.fullName || currentUser?.email || 'محرر المخالفة',
      createdAt:
        reportId && reports.find((x) => x.id === reportId)?.createdAt
          ? reports.find((x) => x.id === reportId)!.createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: targetStatus === 'معتمد' ? principalName : undefined,
      approvedAt: targetStatus === 'معتمد' ? new Date().toISOString() : undefined,
    };
  };

  // Save handler with designated target status (مسودة → جاهز للتوقيع → تم التوقيع → معتمد)
  const handleSaveWithStatus = async (targetStatus: ViolationReportStatus) => {
    if (isViewer) {
      onShowToast('حسابك للقراءة فقط ولا يملك صلاحية تعديل السجلات', 'warning');
      return;
    }

    if (isLocked && targetStatus !== 'مغلق' && !isCorrectionVersion) {
      onShowToast('هذا التقرير معتمد رسمياً ومقفل عن التعديل المباشر. يمكنك إنشاء نسخة تصحيحية', 'warning');
      return;
    }

    if (!selectedStudent) {
      onShowToast('يرجى اختيار طالب لحفظ التقرير', 'warning');
      return;
    }

    if (!description.trim()) {
      onShowToast('يرجى كتابة وصف التصرف / الحادثة / الموقف', 'warning');
      return;
    }

    if (targetStatus === 'معتمد' && !canApprove) {
      onShowToast('اعتماد التقرير متاح فقط للإدارة المدرسية أو المرشد المخول', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const record = buildCurrentRecord(targetStatus);
      await onSaveReport(record);
      setStatus(targetStatus);
      if (targetStatus === 'معتمد') {
        setIsLocked(true);
      }
      onShowToast(
        targetStatus === 'مسودة'
          ? 'تم حفظ تقرير المخالفة كمسودة بنجاح'
          : targetStatus === 'جاهز للتوقيع'
          ? 'تم تحويل حالة التقرير إلى (جاهز للتوقيع)'
          : targetStatus === 'تم التوقيع'
          ? 'تم توثيق التوقيع الإلكتروني وتحديث الحالة إلى (تم التوقيع)'
          : targetStatus === 'معتمد'
          ? 'تم اعتماد تقرير المخالفة (نموذج رقم 6) رسمياً وقفل المحتوى'
          : 'تم تحديث التقرير بنجاح',
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء حفظ التقرير', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Electronic Signature
  const handleSaveElectronicSignature = async (dataUrl: string, timestamp: string) => {
    const finalReportId =
      reportId || `VR-${currentUser?.schoolId || 'alkhalil'}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const sigObj = {
      reportId: finalReportId,
      signerName: reportedBy || currentUser?.fullName || 'محرر المخالفة',
      signerRole: reporterRole || 'معلم المادة',
      oracleNumber: oracleNumber || '',
      signedAt: timestamp || getUaeFullDateTimeString(),
      signatureImage: dataUrl,
      verified: true,
    };

    setElectronicSignatureInfo(sigObj);
    setSignatures((prev) => ({
      ...prev,
      reporter: {
        name: sigObj.signerName,
        role: sigObj.signerRole,
        date: sigObj.signedAt.split(' ')[0],
        time: sigObj.signedAt.split(' ').slice(1).join(' '),
        signatureImage: dataUrl,
        reportId: finalReportId,
        oracleNumber: oracleNumber || '',
      },
    }));

    setIsSigningModalOpen(false);

    // Save with status 'تم التوقيع'
    try {
      setIsSaving(true);
      const updatedRecord: ViolationReportRecord = {
        ...buildCurrentRecord('تم التوقيع'),
        id: finalReportId,
        reportNumber: reportNumber || finalReportId,
        electronicSignatureInfo: sigObj,
        status: 'تم التوقيع',
      };
      await onSaveReport(updatedRecord);
      setStatus('تم التوقيع');
      onShowToast('تم توثيق التوقيع الإلكتروني بنجاح وتحويل حالة التقرير إلى (تم التوقيع)', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء حفظ التوقيع', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newItem: FormAttachmentItem = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type,
          dataUrl: reader.result as string,
          uploadedAt: getUaeTodayDateString(),
        };
        setAttachments((prev) => [...prev, newItem]);
        onShowToast(`تم إرفاق الملف: ${file.name}`, 'info');
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Filtered reports for archive table
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (historyFilterStatus !== 'all' && r.status !== historyFilterStatus) return false;
      if (!historySearchQuery.trim()) return true;
      const q = historySearchQuery.toLowerCase().trim();
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentNumber.includes(q) ||
        r.violationName.toLowerCase().includes(q) ||
        (r.reportNumber && r.reportNumber.toLowerCase().includes(q))
      );
    });
  }, [reports, historySearchQuery, historyFilterStatus]);

  // Workflow progress helper
  const getWorkflowStepIndex = (st: ViolationReportStatus) => {
    switch (st) {
      case 'مسودة':
        return 0;
      case 'جاهز للتوقيع':
        return 1;
      case 'تم التوقيع':
        return 2;
      case 'معتمد':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getWorkflowStepIndex(status);

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 w-fit mb-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-700" />
            <span>ملحق (6) للقرار الوزاري رقم (851) لسنة 2018م</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            نموذج رقم (6) – تقرير مخالفة
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تحرير تقرير المخالفة الرسمي وفق محددات اللائحة الوزارية مع التعبئة التلقائية والتوقيع الإلكتروني
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveViewMode('editor')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
              activeViewMode === 'editor'
                ? 'bg-[#0C2340] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSignature className="w-4 h-4 text-[#D4AF37]" />
            <span>تحرير التقرير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('archive')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
              activeViewMode === 'archive'
                ? 'bg-[#0C2340] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-[#D4AF37]" />
            <span>سجل التقارير ({reports.length})</span>
          </button>

          {activeViewMode === 'editor' && (
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="تفريغ الحقول لإنشاء تقرير جديد"
            >
              <Plus className="w-4 h-4" />
              <span>تقرير جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: FORM EDITOR */}
      {/* ========================================================================= */}
      {activeViewMode === 'editor' && (
        <div className="space-y-6">
          {/* 4-Step Workflow Progress Bar: مسودة → جاهز للتوقيع → تم التوقيع → معتمد */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">مسار اعتماد التقرير:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                    status === 'معتمد'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : status === 'تم التوقيع'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : status === 'جاهز للتوقيع'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  الحالة الحالية: {status}
                </span>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-700" />
                    مقفل رسمياً
                  </span>
                )}
              </div>

              <div className="text-xs font-mono text-slate-500">
                رقم التقرير: <strong className="text-slate-800">{reportNumber || 'قيد الإنشاء'}</strong>
              </div>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: 'مسودة', desc: 'إدخال ومراجعة البيانات' },
                { label: 'جاهز للتوقيع', desc: 'اكتمال الوصف والموقف' },
                { label: 'تم التوقيع', desc: 'التوقيع الإلكتروني موثق' },
                { label: 'معتمد', desc: 'اعتماد الإدارة المدرسية' },
              ].map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                return (
                  <div
                    key={step.label}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-teal-50 border-teal-400 text-[#006D77] font-bold shadow-2xs'
                        : isPassed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                          isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isPassed ? <Check className="w-3 h-3" /> : idx + 1}
                      </span>
                      <span className="text-xs">{step.label}</span>
                    </div>
                    <p className="text-[10px] hidden sm:block truncate opacity-80">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked Notice & Create Correction Button */}
          {isLocked && (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-sm">هذا التقرير معتمد رسمياً ومقفل لحماية السجلات الوزارية</p>
                  <p className="text-amber-800 mt-0.5">
                    في حال الرغبة بتعديل أي بيان، يمكنك إنشاء نسخة تصحيحية مرتبطة بهذا التقرير مع توثيق سبب التعديل.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const curr = reports.find((r) => r.id === reportId);
                  if (curr) handleCreateCorrectionVersion(curr);
                  else {
                    const rec = buildCurrentRecord(status);
                    handleCreateCorrectionVersion(rec);
                  }
                }}
                className="px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-400 font-bold rounded-xl text-amber-900 flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <Copy className="w-4 h-4 text-amber-800" />
                <span>إنشاء نسخة مصححة</span>
              </button>
            </div>
          )}

          {/* SECTION 1: Student Selection & Auto-Fill from Existing Violations */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-[#006D77]" />
              <span>1. بيانات الطالب / الطالبة والتعبئة التلقائية من المخالفات المسجلة</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البحث عن الطالب (بالاسم أو الرقم الطلابي أو الشعبة):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      disabled={isLocked}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="اكتب اسم الطالب أو رقمه الطلابي..."
                      className="w-full py-2.5 pr-10 pl-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>

                  {onOpenGradeSectionSearch && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={onOpenGradeSectionSearch}
                      className="px-3 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-50"
                      title="البحث عن طريق الصفوف والشعب والمسارات"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#006D77]" />
                      <span className="hidden sm:inline">البحث بالصفوف والشعب</span>
                    </button>
                  )}
                </div>

                {searchQuery && filteredStudents.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white shadow-lg z-10 relative">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchQuery('');
                        }}
                        className={`w-full p-2.5 text-right text-xs hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer ${
                          selectedStudentId === s.id ? 'bg-teal-50 font-bold text-teal-900' : ''
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-800">{s.fullName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {s.studentNumber} • الصف {s.grade}/{s.section}
                          </p>
                        </div>
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            selectedStudentId === s.id ? 'text-teal-700' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Selected Student Card (Auto-filled) */}
              {selectedStudent ? (
                <div className="p-4 bg-slate-50 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{selectedStudent.fullName}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-teal-300 text-teal-900">
                      الصف {selectedStudent.grade} ({selectedStudent.section})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400">الرقم الطلابي:</span>{' '}
                      <strong className="font-mono text-slate-800">{selectedStudent.studentNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">المسار الأكاديمي:</span>{' '}
                      <strong className="text-slate-800">{selectedStudent.track || 'عام'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">حالة القيد:</span>{' '}
                      <strong className="text-slate-800">{selectedStudent.status}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">المدرسة:</span>{' '}
                      <strong className="text-slate-800">{schoolSettings.schoolName}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>يرجى اختيار طالب لعرض واستيراد بياناته تلقائياً</span>
                </div>
              )}
            </div>

            {/* Smart 1-Click Auto-Fill from Student's Registered Violations */}
            {selectedStudent && studentExistingViolations.length > 0 && !isLocked && (
              <div className="p-4 bg-gradient-to-r from-teal-50/70 to-blue-50/70 border border-teal-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#006D77]" />
                    <span className="text-xs font-black text-slate-800">
                      سجل مخالفات الطالب المسجلة في النظام ({studentExistingViolations.length} مخالفة):
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    اضغط لتعبئة التقرير تلقائياً دون تكرار
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {studentExistingViolations.map((v) => {
                    const isLinked = linkedViolationId === v.id;
                    return (
                      <div
                        key={v.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                          isLinked
                            ? 'bg-teal-100/70 border-teal-400 font-bold text-teal-950 ring-1 ring-teal-400'
                            : 'bg-white border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        <div className="truncate flex-1">
                          <p className="font-bold truncate text-slate-900">{v.violationType}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {v.violationDegree} • {v.incidentDateTime?.split(' ')[0] || v.incidentDate || 'تاريخ مسجل'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAutoFillFromViolation(v)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                            isLinked
                              ? 'bg-teal-700 text-white'
                              : 'bg-teal-50 text-[#006D77] hover:bg-teal-100 border border-teal-200'
                          }`}
                        >
                          {isLinked ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                          <span>{isLinked ? 'مرتبطة بالتقرير' : 'تعبئة تلقائية'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {linkedViolationId && (
                  <div className="text-[11px] text-teal-800 flex items-center gap-1.5 pt-1">
                    <LinkIcon className="w-3 h-3" />
                    <span>
                      هذا التقرير مرتبط بالمخالفة الأصلية رقم <strong>{linkedViolationId}</strong>، ولن يتم إنشاء مخالفة جديدة أو مكررة.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: Incident Fields (اسم المعلم، تاريخ الحدوث، الموقف، مكان حدوث الموقف، الوقت) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-[#006D77]" />
              <span>2. بيانات الحدوث (المعلم، التاريخ، الموقف، المكان، الوقت)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Teacher Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المعلم <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={teacherName}
                  disabled={isLocked}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="اسم المعلم المعني أو الشاهد"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {/* Incident Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الحدوث <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  disabled={isLocked}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {/* Incident Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوقت <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={incidentTime}
                  disabled={isLocked}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  placeholder="مثال: 08:30 صباحاً"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Incident Situation (الموقف) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموقف <span className="text-rose-600">*</span>
                </label>
                <select
                  value={incidentSituation}
                  disabled={isLocked}
                  onChange={(e) => setIncidentSituation(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                >
                  {INCIDENT_SITUATIONS.map((sit) => (
                    <option key={sit} value={sit}>
                      {sit}
                    </option>
                  ))}
                </select>

                {incidentSituation === 'أخرى (مخصص)' && (
                  <input
                    type="text"
                    value={customIncidentSituation}
                    disabled={isLocked}
                    onChange={(e) => setCustomIncidentSituation(e.target.value)}
                    placeholder="حدد الموقف بالتفصيل..."
                    className="mt-2 w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                  />
                )}
              </div>

              {/* Place of Incident (مكان حدوث الموقف) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مكان حدوث الموقف <span className="text-rose-600">*</span>
                </label>
                <select
                  value={incidentPlace}
                  disabled={isLocked}
                  onChange={(e) => setIncidentPlace(e.target.value as IncidentPlaceType)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                >
                  {INCIDENT_PLACES.map((place) => (
                    <option key={place} value={place}>
                      {place}
                    </option>
                  ))}
                </select>

                {incidentPlace === 'مكان آخر' && (
                  <input
                    type="text"
                    value={customIncidentPlace}
                    disabled={isLocked}
                    onChange={(e) => setCustomIncidentPlace(e.target.value)}
                    placeholder="حدد المكان بدقة..."
                    className="mt-2 w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Description & Action (وصف التصرف / الحادثة / الموقف والإجراء المتخذ) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck className="w-4 h-4 text-[#006D77]" />
              <span>3. وصف التصرف / الحادثة / الموقف والإجراء المتخذ</span>
            </h3>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                وصف التصرف / الحادثة / الموقف <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                disabled={isLocked}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="صف التصرف أو الحادثة أو الموقف بدقة وموضوعية ووضوح..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white leading-relaxed"
              />
            </div>

            {/* Immediate Action Taken */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الإجراء المتخذ <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                value={immediateAction}
                disabled={isLocked}
                onChange={(e) => setImmediateAction(e.target.value)}
                placeholder="سجل الإجراء الفوري المتخذ وفق ما تقرره اللائحة المدرسية..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white leading-relaxed"
              />
            </div>

            {/* Attachments Section */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#006D77]" />
                  <span>المرفقات الداعمة للتقرير (إن وجدت)</span>
                </label>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إرفاق ملف</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{att.name}</span>
                      </div>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: Violation Classification (تصنيف المخالفة حسب لائحة إدارة سلوك الطلبة) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldAlert className="w-4 h-4 text-[#006D77]" />
              <span>4. تصنيف المخالفة: (حسب لائحة إدارة سلوك الطلبة)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Violation Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  درجة المخالفة <span className="text-rose-600">*</span>
                </label>
                <select
                  value={violationLevel}
                  disabled={isLocked}
                  onChange={(e) => {
                    const newLevel = e.target.value as ViolationReportDegree;
                    setViolationLevel(newLevel);
                    setOccurrenceCount(1);
                  }}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#006D77]"
                >
                  {VIOLATION_LEVELS.map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Occurrence Count matching what the official Form 6 allows */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم / مرة التكرار (حسب ما يسمح به النموذج) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={occurrenceCount}
                  disabled={isLocked}
                  onChange={(e) => setOccurrenceCount(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#006D77]"
                >
                  {violationLevel.includes('الأولى') ? (
                    <>
                      <option value={1}>المرة الأولى ( )</option>
                      <option value={2}>المرة الثانية ( )</option>
                      <option value={3}>المرة الثالثة ( )</option>
                    </>
                  ) : violationLevel.includes('الثانية') ? (
                    <>
                      <option value={1}>المرة الأولى ( )</option>
                      <option value={2}>تكرار المخالفة / المرة الثانية ( )</option>
                    </>
                  ) : violationLevel.includes('الثالثة') ? (
                    <option value={1}>المرة الأولى (درجة ثالثة حال ارتكابها)</option>
                  ) : (
                    <option value={1}>المرة الأولى (درجة رابعة المرة الأولى)</option>
                  )}
                </select>
              </div>

              {/* Violation Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مسمى وتصنيف المخالفة باللائحة
                </label>
                <input
                  type="text"
                  value={violationName}
                  disabled={isLocked}
                  onChange={(e) => setViolationName(e.target.value)}
                  placeholder="مثال: استخدام الهاتف داخل الصف، الغياب غير المبرر..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
            </div>

            {/* Official Annex 6 Radio Preview (Visual confirmation) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <span className="font-bold text-slate-700 block">
                معاينة تمثيل التصنيف كما سيظهر في النموذج الرسمي المطبوع:
              </span>
              <div className="space-y-1.5 font-medium text-slate-800 pr-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${violationLevel.includes('الأولى') ? 'bg-black text-white' : ''}`}>
                    {violationLevel.includes('الأولى') && '✓'}
                  </span>
                  <span>درجة أولى حال ارتكابها:</span>
                  <span className="font-mono">
                    ({violationLevel.includes('الأولى') && occurrenceCount === 1 ? ' ✓ ' : '   '}) المرة الأولى
                    {'   '}({violationLevel.includes('الأولى') && occurrenceCount === 2 ? ' ✓ ' : '   '}) المرة الثانية
                    {'   '}({violationLevel.includes('الأولى') && occurrenceCount >= 3 ? ' ✓ ' : '   '}) المرة الثالثة
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${violationLevel.includes('الثانية') ? 'bg-black text-white' : ''}`}>
                    {violationLevel.includes('الثانية') && '✓'}
                  </span>
                  <span>درجة ثانية حال ارتكابها:</span>
                  <span className="font-mono">
                    ({violationLevel.includes('الثانية') && occurrenceCount === 1 ? ' ✓ ' : '   '}) المرة الأولى
                    {'   '}({violationLevel.includes('الثانية') && occurrenceCount > 1 ? ' ✓ ' : '   '})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${violationLevel.includes('الثالثة') ? 'bg-black text-white' : ''}`}>
                    {violationLevel.includes('الثالثة') && '✓'}
                  </span>
                  <span>درجة ثالثة حال ارتكابها:</span>
                  <span className="font-mono">({violationLevel.includes('الثالثة') ? ' ✓ ' : '   '})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${violationLevel.includes('الرابعة') ? 'bg-black text-white' : ''}`}>
                    {violationLevel.includes('الرابعة') && '✓'}
                  </span>
                  <span>درجة رابعة المرة الأولى:</span>
                  <span className="font-mono">({violationLevel.includes('الرابعة') ? ' ✓ ' : '   '})</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Reporter, Oracle & Electronic Signatures (اسم محرر المخالفة، الوظيفة، رقم الأوراكل، مدير المدرسة) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSignature className="w-4 h-4 text-[#006D77]" />
              <span>5. بيانات محرر المخالفة، رقم الأوراكل، والتوقيع الإلكتروني</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Reporter Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم محرر المخالفة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={reportedBy}
                  disabled={isLocked}
                  onChange={(e) => setReportedBy(e.target.value)}
                  placeholder="الاسم الثلاثي لمحرر المخالفة"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {/* Reporter Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوظيفة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={reporterRole}
                  disabled={isLocked}
                  onChange={(e) => setReporterRole(e.target.value)}
                  placeholder="مثال: معلم المادة، مشرف إداري"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {/* Oracle Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الأوراكل <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={oracleNumber}
                  disabled={isLocked}
                  onChange={(e) => setOracleNumber(e.target.value)}
                  placeholder="رقم الأوراكل الوظيفي"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {/* Principal Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مدير المدرسة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={principalName}
                  disabled={isLocked}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="اسم مدير المدرسة"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
            </div>

            {/* Electronic Signature Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-[#006D77]" />
                    <span>التوقيع الإلكتروني المعتمد لتقرير المخالفة</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    يرتبط التوقيع بهذا التقرير تحديداً ويوثق هوية الموقّع، صفته، تاريخ ووقت التوقيع ومعرّف التقرير.
                  </p>
                </div>

                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => setIsSigningModalOpen(true)}
                    className="px-3.5 py-1.5 bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <FileSignature className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{electronicSignatureInfo ? 'تعديل التوقيع الإلكتروني' : 'توقيع التقرير إلكترونياً'}</span>
                  </button>
                )}
              </div>

              {/* Signature Card */}
              {electronicSignatureInfo || signatures?.reporter?.signatureImage ? (
                <div className="p-3 bg-white border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span>تم توثيق التوقيع الإلكتروني بنجاح</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          معتمد ومحمي
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        الموقّع: <strong>{electronicSignatureInfo?.signerName || reportedBy}</strong> • الصفة: {electronicSignatureInfo?.signerRole || reporterRole} • الأوراكل: {electronicSignatureInfo?.oracleNumber || oracleNumber || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        تاريخ ووقت التوقيع: {electronicSignatureInfo?.signedAt || getUaeFullDateTimeString()}
                      </p>
                    </div>
                  </div>

                  {(electronicSignatureInfo?.signatureImage || signatures?.reporter?.signatureImage) && (
                    <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-1.5 flex items-center justify-center self-start sm:self-auto">
                      <img
                        src={electronicSignatureInfo?.signatureImage || signatures.reporter?.signatureImage}
                        alt="التوقيع المعتمد"
                        className="max-h-12 object-contain"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>التقرير بانتظار التوقيع الإلكتروني قبل الاعتماد الرسمي.</span>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ACTIONS BAR (مسودة → جاهز للتوقيع → تم التوقيع → معتمد) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Preview & Print Modal Trigger */}
              <button
                type="button"
                id="btn-preview-violation-report"
                onClick={() => {
                  try {
                    const rec = buildCurrentRecord(status);
                    setActiveReportToPrint(rec);
                    setPrintModalOpen(true);
                  } catch (e: any) {
                    onShowToast(e.message, 'warning');
                  }
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-600" />
                <span>معاينة النموذج الرسمي</span>
              </button>

              <button
                type="button"
                id="btn-print-violation-report-direct"
                onClick={() => {
                  try {
                    const rec = buildCurrentRecord(status);
                    setActiveReportToPrint(rec);
                    setPrintModalOpen(true);
                  } catch (e: any) {
                    onShowToast(e.message, 'warning');
                  }
                }}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-teal-700" />
                <span>طباعة / حفظ PDF</span>
              </button>

              {/* Send message to parent */}
              {onNavigateToMessages && selectedStudent && (
                <button
                  type="button"
                  id="btn-send-report-to-parent"
                  onClick={() => {
                    const msg = `السلام عليكم ورحمة الله، ولي أمر الطالب/ة ${selectedStudent.fullName}، نود إحاطتكم علماً بأنه تم تحرير تقرير مخالفة سلوكية (نموذج رقم 6) بخصوص الواقعة المسجلة بتاريخ ${incidentDate}. نرجو مراجعة الإدارة أو المرشد المدرسي. شاكرين تعاونكم.`;
                    onNavigateToMessages(selectedStudent.id, msg);
                  }}
                  className="px-3.5 py-2 bg-[#0C2340] hover:bg-[#163761] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#D4AF37]" />
                  <span>إرسال لولي الأمر</span>
                </button>
              )}
            </div>

            {/* Workflow Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Step 1: Save Draft */}
              {!isLocked && (
                <button
                  type="button"
                  id="btn-save-report-draft"
                  disabled={isSaving}
                  onClick={() => handleSaveWithStatus('مسودة')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>حفظ مسودة</span>
                </button>
              )}

              {/* Step 2: Ready for Signature */}
              {!isLocked && status === 'مسودة' && (
                <button
                  type="button"
                  id="btn-ready-for-signing"
                  disabled={isSaving}
                  onClick={() => handleSaveWithStatus('جاهز للتوقيع')}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>تجهيز للتوقيع</span>
                </button>
              )}

              {/* Step 3: Open Signing Modal */}
              {!isLocked && (status === 'جاهز للتوقيع' || status === 'مسودة') && (
                <button
                  type="button"
                  id="btn-open-sign-action"
                  disabled={isSaving}
                  onClick={() => setIsSigningModalOpen(true)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSignature className="w-4 h-4 text-blue-700" />
                  <span>توقيع التقرير إلكترونياً</span>
                </button>
              )}

              {/* Step 4: Officially Approve */}
              {canApprove && !isLocked && (
                <button
                  type="button"
                  id="btn-approve-violation-report"
                  disabled={isSaving}
                  onClick={() => handleSaveWithStatus('معتمد')}
                  className="px-5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>اعتماد التقرير رسمياً</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: REPORTS ARCHIVE & AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeViewMode === 'archive' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="بحث في أرشيف التقارير (اسم الطالب، رقمه، رقم التقرير)..."
                className="w-full py-2 pr-10 pl-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">تصفية حسب الحالة:</span>
              <select
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#006D77]"
              >
                <option value="all">كافة الحالات</option>
                <option value="مسودة">مسودة</option>
                <option value="جاهز للتوقيع">جاهز للتوقيع</option>
                <option value="تم التوقيع">تم التوقيع</option>
                <option value="معتمد">معتمد</option>
              </select>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">لا توجد تقارير مخالفات مطابقة</p>
              <p className="text-xs text-slate-400">
                يمكنك تحرير وحفظ تقرير جديد من تبويب «تحرير التقرير»
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-3.5 font-bold">رقم التقرير</th>
                    <th className="py-3 px-3.5 font-bold">اسم الطالب</th>
                    <th className="py-3 px-3.5 font-bold">الصف</th>
                    <th className="py-3 px-3.5 font-bold">تاريخ الحدوث</th>
                    <th className="py-3 px-3.5 font-bold">تصنيف ودرجة المخالفة</th>
                    <th className="py-3 px-3.5 font-bold">محرر المخالفة</th>
                    <th className="py-3 px-3.5 font-bold">الحالة</th>
                    <th className="py-3 px-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-700">
                        {r.reportNumber || r.id}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">{r.studentName}</td>
                      <td className="py-3 px-3.5 text-slate-600">الصف {r.grade}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{r.incidentDate}</td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                          {r.violationName}
                        </span>
                        <span className="text-[10px] text-slate-400">{r.violationLevel}</span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{r.reportedBy || '—'}</td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.status === 'معتمد'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : r.status === 'تم التوقيع'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : r.status === 'جاهز للتوقيع'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReportToPrint(r);
                              setPrintModalOpen(true);
                            }}
                            className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="معاينة وطباعة النموذج الرسمي"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadReport(r)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="فتح وتحرير التقرير"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {onDeleteReport && !isViewer && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف التقرير رقم (${r.reportNumber || r.id})؟`)) {
                                  onDeleteReport(r.id, r.studentName);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف التقرير"
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

      {/* ========================================================================= */}
      {/* SIGNING MODAL (ELECTRONIC SIGNATURE CAPTURE) */}
      {/* ========================================================================= */}
      {isSigningModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#006D77]" />
                <h3 className="font-black text-sm text-slate-900">
                  التوقيع الإلكتروني الرسمي – تقرير مخالفة (نموذج رقم 6)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSigningModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
              <p>
                <strong>اسم الموقّع:</strong> {reportedBy || currentUser?.fullName}
              </p>
              <p>
                <strong>الصفة / الوظيفة:</strong> {reporterRole}
              </p>
              {oracleNumber && (
                <p>
                  <strong>رقم الأوراكل:</strong> {oracleNumber}
                </p>
              )}
              <p className="font-mono text-[10px] text-teal-700">
                معرف التقرير: {reportNumber || reportId || 'قيد التوليد'}
              </p>
            </div>

            <SignatureCanvas
              id="report-electronic-signature"
              title="لوحة التوقيع الإلكتروني"
              subtitle="وقع بوضوح داخل الإطار أدناه لتوثيق التقرير رسمياً"
              initialSignature={signatures?.reporter?.signatureImage}
              signerType="محرر البلاغ"
              counselorName={reportedBy || 'محرر المخالفة'}
              onSave={(dataUrl, timestamp) => handleSaveElectronicSignature(dataUrl, timestamp)}
              onClear={() => {}}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT PREVIEW MODAL (OFFICIAL MINISTERIAL ANNEX 6 TEMPLATE) */}
      {/* ========================================================================= */}
      <PrintViolationReportModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        report={activeReportToPrint}
      />
    </div>
  );
};
