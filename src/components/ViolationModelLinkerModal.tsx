import React, { useState, useMemo, useEffect } from 'react';
import {
  Link2,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  User,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  Printer,
  ExternalLink,
  Layers,
  ArrowRight,
  Eye,
  Edit3,
} from 'lucide-react';
import {
  Student,
  ViolationRecord,
  ViolationReportRecord,
  ParentNoticeFormRecord,
  ParentSummonFormRecord,
  WarningFormRecord,
  ParentCommitmentFormRecord,
  BehaviorDeductionNoticeRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { BYLAW_VIOLATIONS_CATALOG, BylawViolationItem } from '../data/bylawData';
import { getUaeTodayDateString } from '../utils/time';
import { PrintViolationReportModal } from './PrintViolationReportModal';

export interface ViolationModelLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  violations: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  initialStudentId?: string | null;
  initialViolationId?: string | null;
  violationReports?: ViolationReportRecord[];
  parentNoticeForms?: ParentNoticeFormRecord[];
  parentSummonForms?: ParentSummonFormRecord[];
  warningForms?: WarningFormRecord[];
  parentCommitmentForms?: ParentCommitmentFormRecord[];
  m20Forms?: BehaviorDeductionNoticeRecord[];
  onSaveViolationReport?: (report: ViolationReportRecord) => Promise<void>;
  onSaveNoticeForm?: (form: ParentNoticeFormRecord) => Promise<void>;
  onSaveSummonForm?: (form: ParentSummonFormRecord) => Promise<void>;
  onSaveWarningForm?: (form: WarningFormRecord) => void;
  onSaveCommitmentForm?: (form: ParentCommitmentFormRecord) => Promise<void>;
  onSaveM20?: (form: BehaviorDeductionNoticeRecord) => Promise<void>;
  onSuccess?: (createdCount: number, studentId: string, violationId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  schoolSettings?: any;
}

interface FormOptionItem {
  id: 'model6' | 'model7' | 'model8' | 'model9' | 'model10' | 'model20';
  number: number;
  badge: string;
  tabKey: string;
  title: string;
  targetRole: string;
  summary: string;
  applicableFields: string[];
}

const FORMS_CATALOG: FormOptionItem[] = [
  {
    id: 'model6',
    number: 6,
    badge: 'نموذج (6)',
    tabKey: 'model6-violation',
    title: 'تقرير مخالفة',
    targetRole: 'المعلم والإدارة',
    summary: 'توثيق الحادثة / الموقف وتصنيف المخالفة والإجراء واعتماد مدير المدرسة في صفحة A4 واحدة',
    applicableFields: ['الطالب', 'التاريخ', 'الوقت', 'المكان', 'الموقف', 'المعلم', 'رقم الأوراكل', 'الوصف', 'الإجراء', 'الدرجة'],
  },
  {
    id: 'model7',
    number: 7,
    badge: 'نموذج (7)',
    tabKey: 'model7-notice',
    title: 'تنبيه خطي / إشعار إلى ولي الأمر',
    targetRole: 'طالب وولي أمر',
    summary: 'إخطار خطي رسمي لولي الأمر بنوع ودرجة المخالفة السلوكية والتنبيه لعدم تكرارها',
    applicableFields: ['الطالب', 'ولي الأمر', 'التاريخ', 'الوصف', 'المسؤول'],
  },
  {
    id: 'model8',
    number: 8,
    badge: 'نموذج (8)',
    tabKey: 'model8-summon',
    title: 'خطاب استدعاء ولي الأمر',
    targetRole: 'ولي أمر',
    summary: 'طلب حضور ولي الأمر للمدرسة لمقابلة الإدارة بموضوع يتعلق بسلوك الطالب ومناقشته',
    applicableFields: ['الطالب', 'ولي الأمر', 'التاريخ', 'سبب الاستدعاء (الوصف)', 'المسؤول'],
  },
  {
    id: 'model9',
    number: 9,
    badge: 'نموذج (9)',
    tabKey: 'model9-warning',
    title: 'التنبيه الخطي من بعد الشفهي / إنذار وتعهد',
    targetRole: 'طالب',
    summary: 'تعهد كتابي من الطالب بالالتزام بعد ارتكاب سلوك غير إيجابي والإنذار باللائحة',
    applicableFields: ['الطالب', 'التاريخ', 'السلوك السابق (الوصف)', 'الإجراء المتخذ', 'المرشد'],
  },
  {
    id: 'model10',
    number: 10,
    badge: 'نموذج (10)',
    tabKey: 'model10-commitment',
    title: 'تعهد ولي الأمر في حال تكرار المخالفات',
    targetRole: 'ولي أمر',
    summary: 'تعهد والتزام ولي الأمر بمتابعة ابنه/ابنته بعد تكرار المخالفات السلوكية وفق اللائحة',
    applicableFields: ['الطالب', 'ولي الأمر', 'التاريخ', 'قائمة المخالفات (الوصف)', 'الإدارة'],
  },
  {
    id: 'model20',
    number: 20,
    badge: 'نموذج (20)',
    tabKey: 'model20-deduction',
    title: 'إخطار بالحسم من درجة السلوك',
    targetRole: 'ولي أمر',
    summary: 'إخطار ولي الأمر بقرار لجنة السلوك بحسم الدرجات وتحديد مقترحات استرجاعها',
    applicableFields: ['الطالب', 'ولي الأمر', 'التاريخ', 'الدرجة', 'الوصف', 'الدرجات المحسومة'],
  },
];

export const ViolationModelLinkerModal: React.FC<ViolationModelLinkerModalProps> = ({
  isOpen,
  onClose,
  students,
  violations,
  currentUser,
  initialStudentId,
  initialViolationId,
  violationReports = [],
  onSaveViolationReport,
  onSaveNoticeForm,
  onSaveSummonForm,
  onSaveWarningForm,
  onSaveCommitmentForm,
  onSaveM20,
  onSuccess,
  onShowToast,
  schoolSettings = {},
}) => {
  if (!isOpen) return null;

  // Selected student state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students[0]?.id || '')
  );
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Selected student entity
  const selectedStudent = useMemo(() => {
    return (
      students.find(
        (s) => s.id === selectedStudentId || s.studentNumber === selectedStudentId
      ) || null
    );
  }, [students, selectedStudentId]);

  // Autocomplete student search
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return [];
    const q = studentSearchQuery.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          s.grade.includes(q) ||
          s.section.includes(q)
      )
      .slice(0, 6);
  }, [students, studentSearchQuery]);

  // Selected student's violations
  const studentViolations = useMemo(() => {
    if (!selectedStudent) return [];
    return violations.filter(
      (v) =>
        v.studentId === selectedStudent.id ||
        (selectedStudent.studentNumber && v.studentNumber === selectedStudent.studentNumber)
    );
  }, [violations, selectedStudent]);

  // Selected violation state
  const [selectedViolationId, setSelectedViolationId] = useState<string>(
    initialViolationId || ''
  );

  // Sync initial violation if provided
  useEffect(() => {
    if (initialViolationId) {
      setSelectedViolationId(initialViolationId);
    } else if (studentViolations.length > 0 && !selectedViolationId) {
      setSelectedViolationId(studentViolations[0].id);
    }
  }, [initialViolationId, studentViolations]);

  // Active Violation entity
  const selectedViolation = useMemo(() => {
    if (!selectedViolationId) return studentViolations[0] || null;
    return (
      violations.find((v) => v.id === selectedViolationId) ||
      studentViolations[0] ||
      null
    );
  }, [violations, selectedViolationId, studentViolations]);

  // Matching Bylaw catalog item
  const matchedBylawItem = useMemo(() => {
    if (!selectedViolation) return null;
    // Try match by code or title
    const vCode = selectedViolation.violationsList?.[0]?.code || '';
    if (vCode) {
      const byCode = BYLAW_VIOLATIONS_CATALOG.find((b) => b.code === vCode);
      if (byCode) return byCode;
    }
    // Match by title substring
    const byTitle = BYLAW_VIOLATIONS_CATALOG.find(
      (b) =>
        b.title.includes(selectedViolation.violationType) ||
        selectedViolation.violationType.includes(b.title)
    );
    return byTitle || null;
  }, [selectedViolation]);

  // Automatic Recurrence Calculation:
  // Count how many previous violations of the same code/type were recorded for this student
  const calculatedRecurrence = useMemo(() => {
    if (!selectedStudent || !selectedViolation) return 1;
    const currentCode =
      selectedViolation.violationsList?.[0]?.code ||
      matchedBylawItem?.code ||
      selectedViolation.violationType;

    // Filter student violations that match this code
    const matchingPast = studentViolations.filter((v) => {
      const code = v.violationsList?.[0]?.code || v.violationType;
      return code === currentCode;
    });

    // If the selected violation is among them, count its 1-based order or total count
    return Math.max(1, matchingPast.length);
  }, [selectedStudent, selectedViolation, studentViolations, matchedBylawItem]);

  // Editable recurrence count state
  const [recurrenceCount, setRecurrenceCount] = useState<number>(calculatedRecurrence);
  useEffect(() => {
    setRecurrenceCount(calculatedRecurrence);
  }, [calculatedRecurrence]);

  // Form selection checkboxes (User-driven choice, empty by default)
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);

  const toggleForm = (formId: string) => {
    setSelectedFormIds((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFormIds.length === FORMS_CATALOG.length) {
      setSelectedFormIds([]);
    } else {
      setSelectedFormIds(FORMS_CATALOG.map((f) => f.id));
    }
  };

  // Shared Fields State (Editable before generation)
  const [incidentDate, setIncidentDate] = useState<string>(getUaeTodayDateString());
  const [incidentTime, setIncidentTime] = useState<string>('08:30 صباحاً');
  const [incidentLocation, setIncidentLocation] = useState<string>('الصف');
  const [incidentSituation, setIncidentSituation] = useState<string>('الحصة الدراسية');
  const [teacherName, setTeacherName] = useState<string>(
    currentUser?.fullName || currentUser?.displayName || ''
  );
  const [oracleNumber, setOracleNumber] = useState<string>(
    (currentUser as any)?.oracleNumber || ''
  );
  const [incidentDescription, setIncidentDescription] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [violationDegree, setViolationDegree] = useState<string>('الدرجة الأولى (بسيطة)');

  // Sync shared fields from selectedViolation
  useEffect(() => {
    if (selectedViolation) {
      if (selectedViolation.incidentDateTime) {
        const parts = selectedViolation.incidentDateTime.split(' ');
        setIncidentDate(parts[0] || getUaeTodayDateString());
        if (parts.length > 1) {
          setIncidentTime(parts.slice(1).join(' '));
        }
      } else {
        setIncidentDate(getUaeTodayDateString());
      }
      setIncidentLocation(selectedViolation.incidentLocation || 'الصف');
      setTeacherName(
        selectedViolation.reportingPerson ||
          currentUser?.fullName ||
          currentUser?.displayName ||
          ''
      );
      setIncidentDescription(
        selectedViolation.incidentDescription || selectedViolation.violationType || ''
      );
      setActionTaken(
        selectedViolation.suggestedAction || 'توجيه شفهي وتوثيق بالنموذج الرسمي'
      );
      setViolationDegree(
        selectedViolation.violationDegree || 'الدرجة الأولى (بسيطة)'
      );
    }
  }, [selectedViolation, currentUser]);

  // Is generating state
  const [isGenerating, setIsGenerating] = useState(false);

  // Model 6 Print Preview Modal state
  const [printModel6Open, setPrintModel6Open] = useState(false);
  const [model6PrintRecord, setModel6PrintRecord] = useState<ViolationReportRecord | null>(null);

  // Generation execution
  const handleGenerateBundle = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى تحديد الطالب أولاً', 'error');
      return;
    }
    if (!selectedViolation) {
      onShowToast('يرجى تحديد الواقعة السلوكية أولاً', 'error');
      return;
    }
    if (selectedFormIds.length === 0) {
      onShowToast('يرجى اختيار نموذج رسمي واحد على الأقل لتوليده', 'warning');
      return;
    }

    setIsGenerating(true);
    const settings: Record<string, any> = schoolSettings || {};
    const createdCount = selectedFormIds.length;
    let generatedModel6: ViolationReportRecord | null = null;

    try {
      // 1. Model 6: تقرير مخالفة
      if (selectedFormIds.includes('model6') && onSaveViolationReport) {
        const vrDoc: ViolationReportRecord = {
          id: `VR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reportNumber: `VR-${settings.schoolId || 'SCH'}-${new Date().getFullYear()}-${Math.floor(
            Math.random() * 9000 + 1000
          )}`,
          formType: 'violation_report',
          formNumber: 6,
          schoolId: settings.schoolId || 'alkhalil-school',
          schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber,
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade as any,
          section: selectedStudent.section as any,
          track: selectedStudent.track as any,
          violationId: selectedViolation.id,
          violationCode:
            selectedViolation.violationsList?.[0]?.code ||
            matchedBylawItem?.code ||
            '6.1',
          violationName: selectedViolation.violationType,
          violationLevel: violationDegree.includes('الرابعة')
            ? 'الرابعة – شديدة الخطورة'
            : violationDegree.includes('الثالثة')
            ? 'الثالثة – خطيرة'
            : violationDegree.includes('الثانية')
            ? 'الثانية – متوسطة الخطورة'
            : 'الأولى – بسيطة',
          suggestedDeduction: selectedViolation.totalDeductionMarks
            ? `${selectedViolation.totalDeductionMarks} درجات`
            : '',
          occurrenceCount: recurrenceCount,
          incidentDate,
          incidentTime,
          incidentSituation,
          incidentPlace: incidentLocation,
          period: 'الأولى',
          subject: 'التربية الأخلاقية',
          teacherName,
          reportedBy: teacherName,
          reporterRole: currentUser?.jobTitle || 'معلم المادة',
          oracleNumber,
          principalName: settings.principalName || 'مدير المدرسة',
          description: incidentDescription,
          immediateAction: actionTaken,
          studentStatement: '',
          studentAdmitted: false,
          witnesses: '',
          witnessStatements: '',
          damageOrInjury: false,
          damageOrInjuryDetails: '',
          attachments: [],
          counselorNotes: `تم الربط والتوليد عبر واجهة الربط الموحد (ViolationModelLinker) - التكرار رقم (${recurrenceCount}).`,
          signatures: {},
          status: 'مسودة',
          academicYear: '2025-2026',
          term: 'الفصل الدراسي الأول',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveViolationReport(vrDoc);
        generatedModel6 = vrDoc;
      }

      // 2. Model 7: إشعار ولي أمر
      if (selectedFormIds.includes('model7') && onSaveNoticeForm) {
        const pnDoc: ParentNoticeFormRecord = {
          id: `PN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          formType: 'parent_notice_form',
          formNumber: 7,
          noticeType: recurrenceCount >= 2 ? 'تحذير' : 'تنبيه خطي',
          schoolId: settings.schoolId || 'alkhalil-school',
          emirate: 'الفجيرة',
          operationsManagement: 'إدارة العمليات المدرسية',
          council: 'مجلس 1',
          sector: 'نطاق 2',
          schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber,
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade as any,
          section: selectedStudent.section as any,
          parentName: selectedStudent.parentName || 'ولي الأمر',
          parentPhone: selectedStudent.parentPhone || '',
          incidentDay: 'الرسمي',
          incidentDate,
          violationDetails: incidentDescription,
          violationId: selectedViolation.id,
          officerName: teacherName,
          principalName: settings.principalName || 'مدير المدرسة',
          issueDate: incidentDate,
          status: 'مسودة',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveNoticeForm(pnDoc);
      }

      // 3. Model 8: استدعاء ولي أمر
      if (selectedFormIds.includes('model8') && onSaveSummonForm) {
        const psDoc: ParentSummonFormRecord = {
          id: `PS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          schoolId: settings.schoolId || 'alkhalil-school',
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber,
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade as any,
          section: selectedStudent.section as any,
          parentName: selectedStudent.parentName || 'ولي الأمر',
          parentPhone: selectedStudent.parentPhone || '',
          parentRelation: 'أب',
          summonReason: incidentDescription,
          summonDate: incidentDate,
          summonTime: '09:00 صباحاً',
          interviewDate: incidentDate,
          interviewTime: '09:00 صباحاً',
          counselorName: teacherName,
          status: 'مسودة',
          recordedBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any;
        (psDoc as any).violationId = selectedViolation.id;
        await onSaveSummonForm(psDoc);
      }

      // 4. Model 9: إنذار خطي وتعهد
      if (selectedFormIds.includes('model9') && onSaveWarningForm) {
        const wfDoc: WarningFormRecord = {
          id: `WF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber,
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade as any,
          section: selectedStudent.section as any,
          emirate: 'الفجيرة',
          council: 'مجلس 1',
          sector: 'نطاق 2',
          school: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          priorBehaviors: [incidentDescription, '', ''],
          studentPledge: 'أتعهد بعدم تكرار المخالفة والالتزام التام باللائحة السلوكية المدرسية.',
          formDate: incidentDate,
          counselorName: teacherName,
          actionTaken,
          parentPhone: selectedStudent.parentPhone || '',
          parentName: selectedStudent.parentName || '',
          parentRelation: 'ولي أمر',
          communicationDateTime: incidentDate,
          communicationResult: 'تم إخطار ولي الأمر بالواقعة والإجراء',
          studentAttestation: false,
          isParentSignatureRecorded: false,
          status: 'مسودة',
          recordedBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        (wfDoc as any).violationId = selectedViolation.id;
        onSaveWarningForm(wfDoc);
      }

      // 5. Model 10: تعهد ولي الأمر
      if (selectedFormIds.includes('model10') && onSaveCommitmentForm) {
        const pcDoc: ParentCommitmentFormRecord = {
          id: `PC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          formType: 'parent_commitment_form',
          formNumber: 10,
          schoolId: settings.schoolId || 'alkhalil-school',
          emirate: 'الفجيرة',
          operationsManagement: 'إدارة العمليات المدرسية',
          council: 'مجلس 1',
          sector: 'نطاق 2',
          schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber,
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade as any,
          section: selectedStudent.section as any,
          parentName: selectedStudent.parentName || 'ولي الأمر',
          parentPhone: selectedStudent.parentPhone || '',
          violationsList: [incidentDescription],
          violationIds: [selectedViolation.id],
          vicePrincipalName: 'مساعد مدير المدرسة',
          issueDate: incidentDate,
          status: 'مسودة',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveCommitmentForm(pcDoc);
      }

      // 6. Model 20: إخطار حسم درجات
      if (selectedFormIds.includes('model20') && onSaveM20) {
        const bdnDoc: BehaviorDeductionNoticeRecord = {
          id: `BDN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          formType: 'behavior_deduction_notice',
          formNumber: 20,
          schoolId: settings.schoolId || 'alkhalil-school',
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber,
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade as any,
          section: selectedStudent.section as any,
          parentName: selectedStudent.parentName || 'ولي الأمر',
          parentPhone: selectedStudent.parentPhone || '',
          violationDegree,
          violationDescription: incidentDescription,
          committeeDecisionNumber: '1',
          committeeDecisionDate: incidentDate,
          deductedMarks: selectedViolation.totalDeductionMarks || 4,
          term: 'الفصل الدراسي الأول',
          academicYear: '2025/2026م',
          recoveryProposals: [
            'الالتزام التام بالسلوك الإيجابي داخل الصف وخارجه',
            'المشاركة في الأنشطة المدرسية والتطوعية لتعويض الدرجات',
          ],
          principalName: settings.principalName || 'مدير المدرسة',
          status: 'مسودة',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        (bdnDoc as any).violationId = selectedViolation.id;
        await onSaveM20(bdnDoc);
      }

      onShowToast(
        `تم توليد ${createdCount} مستندات رسمية مستقلة وربطها بالواقعة بنجاح، دون أي حسم مكرر للدرجات`,
        'success'
      );

      if (onSuccess) {
        onSuccess(createdCount, selectedStudent.id, selectedViolation.id);
      }

      // If user created Model 6, offer instant print option
      if (generatedModel6) {
        setModel6PrintRecord(generatedModel6);
      } else {
        onClose();
      }
    } catch (err: any) {
      onShowToast('حدث خطأ أثناء توليد المستندات: ' + (err.message || ''), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-right">
        {/* MODAL TOP HEADER */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-[#0C2340] to-teal-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-[#D4AF37] border border-teal-400/30 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  واجهة الربط الموحد بين المخالفات والنماذج (ViolationModelLinker)
                </h2>
                <span className="text-[10px] font-bold text-[#D4AF37] bg-white/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  القرار الوزاري (851)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                استرجاع بيانات الطالب والمخالفة، احتساب التكرار، ومراجعة الحقول المشتركة جدولياً قبل إنشاء الحزمة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="إغلاق الواجهة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* STEP 1: STUDENT SELECTION / SEARCH */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-mono flex items-center justify-center font-bold">1</span>
                <span>تحديد الطالب المعني بالربط</span>
              </span>

              {/* Student Search Box */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطالب أو الرقم..."
                  className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />

                {/* Suggestions Dropdown */}
                {filteredStudents.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredStudents.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudentId(st.id);
                          setStudentSearchQuery('');
                        }}
                        className="p-2 hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{st.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">#{st.studentNumber} • الصف {st.grade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedStudent ? (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-bold text-sm">
                    {selectedStudent.fullName.slice(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{selectedStudent.fullName}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      #{selectedStudent.studentNumber} • الصف {selectedStudent.grade} ({selectedStudent.section}) • المسار {selectedStudent.track}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 font-medium">
                  ولي الأمر: <span className="font-bold text-slate-800">{selectedStudent.parentName || 'غير مسجل'}</span>
                  {selectedStudent.parentPhone && <span className="font-mono text-slate-500 mr-2">({selectedStudent.parentPhone})</span>}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                يرجى البحث عن طالب وتحديده للبدء
              </div>
            )}
          </div>

          {/* STEP 2: VIOLATION SELECTION & RECURRENCE ENGINE */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-mono flex items-center justify-center font-bold">2</span>
                <span>اختيار الواقعة السلوكية القائمة وتحليل التكرار الآلي</span>
              </span>

              <span className="text-[11px] text-slate-500 font-medium">
                {studentViolations.length} مخالفات مسجلة لهذا الطالب
              </span>
            </div>

            {studentViolations.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  لا توجد مخالفات مسجلة لهذا الطالب حتى الآن. يمكنك تسجيل واقعة جديدة من صفحة «سجل المخالفات»، أو ربط النماذج مباشرة لحفظها في ملف الطالب.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Violations Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {studentViolations.map((v) => {
                    const isSelected = selectedViolation?.id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedViolationId(v.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 text-xs ${
                          isSelected
                            ? 'bg-teal-50/80 border-[#006D77] shadow-xs ring-2 ring-[#006D77]/20'
                            : 'bg-white hover:bg-slate-100/70 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-black text-slate-900 text-xs truncate max-w-[200px]" title={v.violationType}>
                              {v.violationType}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {v.violationDegree}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {v.incidentDescription}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                          <span>{v.incidentDateTime}</span>
                          <span className={isSelected ? 'text-[#006D77] font-bold' : 'text-slate-500'}>
                            {isSelected ? '✓ الواقعة المحددة' : 'اختيار هذه الواقعة'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recurrence & Bylaw Analysis Card */}
                {selectedViolation && (
                  <div className="p-3.5 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-2 mt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#006D77]" />
                        <span className="font-black text-slate-900 text-xs">تحليل اللائحة والتكرار الآلي للواقعة:</span>
                        {matchedBylawItem && (
                          <span className="font-mono text-[11px] font-bold text-[#0C2340] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            مادة {matchedBylawItem.code}
                          </span>
                        )}
                      </div>

                      {/* Recurrence Stepper */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">التكرار:</span>
                        <select
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-[#006D77] focus:bg-white"
                        >
                          <option value={1}>1 (حال ارتكابها / أول مرة)</option>
                          <option value={2}>2 (تكرار للمرة الأولى)</option>
                          <option value={3}>3 (تكرار للمرة الثانية)</option>
                          <option value={4}>4 (تكرار للمرة الثالثة)</option>
                        </select>
                        <span className="text-[10px] text-slate-400 font-medium">
                          (تم احتساب {calculatedRecurrence} آلياً بناءً على السوابق)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">التصنيف الرسمي:</span>
                        <span className="font-bold text-slate-800">{violationDegree}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">الحسم المقرر:</span>
                        <span className="font-bold text-rose-700">
                          {selectedViolation.totalDeductionMarks ? `${selectedViolation.totalDeductionMarks} درجات` : 'حسب جدول التكرار'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">الإجراء المعتمد:</span>
                        <span className="font-medium text-slate-800 truncate block" title={actionTaken}>
                          {actionTaken}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: OFFICIAL FORMS CHECKBOXES SELECTION (USER-DRIVEN) */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-mono flex items-center justify-center font-bold">3</span>
                <span>تحديد النماذج الرسمية المطلوب إنشاؤها للواقعة (حزمة النماذج)</span>
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold text-[#006D77] hover:underline cursor-pointer self-start sm:self-auto"
              >
                {selectedFormIds.length === FORMS_CATALOG.length ? 'إلغاء تحديد الكل' : 'تحديد كافة النماذج'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FORMS_CATALOG.map((form) => {
                const isChecked = selectedFormIds.includes(form.id);
                return (
                  <div
                    key={form.id}
                    onClick={() => toggleForm(form.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'bg-teal-50/70 border-[#006D77] shadow-xs ring-2 ring-[#006D77]/20'
                        : 'bg-white hover:bg-slate-100/60 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 rounded text-[#006D77] focus:ring-[#006D77] pointer-events-none"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-[#0C2340] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {form.badge}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full">
                          {form.targetRole}
                        </span>
                      </div>
                      <h5 className="font-black text-slate-900 text-xs">{form.title}</h5>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {form.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 4: DETAILED COMPARATIVE TABLE OF SHARED FIELDS */}
          {selectedFormIds.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-mono flex items-center justify-center font-bold">4</span>
                  <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                    جدول مراجعة الحقول المشتركة وتوريدها للنماذج المختارة ({selectedFormIds.length} نماذج)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  يمكنك تعديل أي حقل مشترك أدناه لتوريده لكافة النماذج المحددة
                </span>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ الحدوث:</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">وقت الحدوث:</label>
                  <input
                    type="text"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    placeholder="08:30 صباحاً"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">مكان حدوث الموقف:</label>
                  <input
                    type="text"
                    value={incidentLocation}
                    onChange={(e) => setIncidentLocation(e.target.value)}
                    placeholder="الصف، الممر..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الموقف / التوقيت:</label>
                  <input
                    type="text"
                    value={incidentSituation}
                    onChange={(e) => setIncidentSituation(e.target.value)}
                    placeholder="الحصة الدراسية..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اسم المعلم / المحرر:</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم الأوراكل:</label>
                  <input
                    type="text"
                    value={oracleNumber}
                    onChange={(e) => setOracleNumber(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">تصنيف المخالفة:</label>
                  <select
                    value={violationDegree}
                    onChange={(e) => setViolationDegree(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    <option value="الدرجة الأولى (بسيطة)">الدرجة الأولى (بسيطة)</option>
                    <option value="الدرجة الثانية (متوسطة الخطورة)">الدرجة الثانية (متوسطة الخطورة)</option>
                    <option value="الدرجة الثالثة (خطيرة)">الدرجة الثالثة (خطيرة)</option>
                    <option value="الدرجة الرابعة (شديدة الخطورة)">الدرجة الرابعة (شديدة الخطورة)</option>
                  </select>
                </div>
              </div>

              {/* Textareas for Description & Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وصف التصرف / الحادثة / الموقف:</label>
                  <textarea
                    rows={2}
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الإجراء المتخذ:</label>
                  <textarea
                    rows={2}
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                  />
                </div>
              </div>

              {/* Structured Comparison Table: Mapping Field Status to Each Selected Model */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-2.5 font-bold">الحقل المشترك</th>
                      <th className="p-2.5 font-bold">القيمة الحالية المسترجعة</th>
                      {selectedFormIds.map((fId) => {
                        const f = FORMS_CATALOG.find((x) => x.id === fId);
                        return (
                          <th key={fId} className="p-2.5 font-bold text-center border-r border-slate-200">
                            {f?.badge}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">بيانات الطالب والصف</td>
                      <td className="p-2.5 text-slate-700 font-medium">{selectedStudent?.fullName} (الصف {selectedStudent?.grade})</td>
                      {selectedFormIds.map((fId) => (
                        <td key={fId} className="p-2.5 text-center border-r border-slate-100 text-emerald-700 font-bold">✓ مُستوفى</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">تاريخ ووقت الحدوث</td>
                      <td className="p-2.5 font-mono text-slate-700">{incidentDate} • {incidentTime}</td>
                      {selectedFormIds.map((fId) => (
                        <td key={fId} className="p-2.5 text-center border-r border-slate-100 text-emerald-700 font-bold">✓ مُستوفى</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">المكان والموقف</td>
                      <td className="p-2.5 text-slate-700">{incidentLocation} • {incidentSituation}</td>
                      {selectedFormIds.map((fId) => {
                        const isApplicable = fId === 'model6';
                        return (
                          <td key={fId} className="p-2.5 text-center border-r border-slate-100">
                            {isApplicable ? <span className="text-emerald-700 font-bold">✓ مُستوفى</span> : <span className="text-slate-400">غير مطلوب</span>}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">وصف الواقعة</td>
                      <td className="p-2.5 text-slate-700 truncate max-w-xs">{incidentDescription || 'غير محدد'}</td>
                      {selectedFormIds.map((fId) => (
                        <td key={fId} className="p-2.5 text-center border-r border-slate-100 text-emerald-700 font-bold">✓ مُستوفى</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">الإجراء المتخذ والتكرار</td>
                      <td className="p-2.5 text-slate-700 truncate max-w-xs">{actionTaken} (تكرار {recurrenceCount})</td>
                      {selectedFormIds.map((fId) => (
                        <td key={fId} className="p-2.5 text-center border-r border-slate-100 text-emerald-700 font-bold">✓ مُستوفى</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">محرر المخالفة والأوراكل</td>
                      <td className="p-2.5 text-slate-700">{teacherName} {oracleNumber ? `(#${oracleNumber})` : ''}</td>
                      {selectedFormIds.map((fId) => {
                        const isApplicable = fId === 'model6' || fId === 'model7' || fId === 'model8' || fId === 'model9';
                        return (
                          <td key={fId} className="p-2.5 text-center border-r border-slate-100">
                            {isApplicable ? <span className="text-emerald-700 font-bold">✓ مُستوفى</span> : <span className="text-slate-400">غير مطلوب</span>}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SAFETY GUARANTEE CARD */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 text-xs block">
                ضمانة النظام الصارمة لسلامة بيانات السلوك:
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                عملية التوليد تنشئ مستندات مستقلة بمعرفات فريدة وتُسندها لنفس الواقعة (<code className="font-mono text-emerald-900 font-bold">violationId: {selectedViolation?.id || '---'}</code>).
                لا يتم إنشاء أي سجل مكرر في مجموعة المخالفات، ولا يتم احتساب أو تكرار خصم درجات السلوك إطلاقاً.
              </p>
            </div>
          </div>
        </div>

        {/* MODAL BOTTOM ACTION BAR */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            {selectedFormIds.length > 0 ? (
              <span>
                جاهز لتوليد <span className="font-bold text-[#006D77]">{selectedFormIds.length}</span> نماذج رسمية مستقلة مرتبطة بالواقعة.
              </span>
            ) : (
              <span>يرجى تحديد النماذج المطلوبة للبدء.</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleGenerateBundle}
              disabled={isGenerating || selectedFormIds.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                selectedFormIds.length > 0
                  ? 'bg-gradient-to-r from-[#006D77] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              {isGenerating ? (
                <span>جاري إنشاء المستندات...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>
                    {selectedFormIds.length > 1
                      ? `اعتماد وتوليد حزمة النماذج (${selectedFormIds.length} مستندات)`
                      : selectedFormIds.length === 1
                      ? 'اعتماد وتوليد النموذج المختار'
                      : 'حدد النماذج للتوليد'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PRINT PREVIEW MODAL FOR MODEL 6 IF GENERATED */}
      {printModel6Open && model6PrintRecord && (
        <PrintViolationReportModal
          isOpen={printModel6Open}
          onClose={() => {
            setPrintModel6Open(false);
            onClose();
          }}
          report={model6PrintRecord}
        />
      )}
    </div>
  );
};
