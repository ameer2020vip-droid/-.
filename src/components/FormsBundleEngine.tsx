import React, { useState, useMemo } from 'react';
import {
  Layers,
  FileText,
  AlertTriangle,
  FileSignature,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw,
  Plus,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
  MapPin,
  User,
  ArrowRight,
  ExternalLink,
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
import { getUaeTodayDateString } from '../utils/time';
import { PrintViolationReportModal } from './PrintViolationReportModal';

export interface FormsBundleEngineProps {
  students: Student[];
  violations: ViolationRecord[];
  currentUser: CounselorUser | AppUser | null;
  activeStudent: Student | null;
  selectedViolationId: string | null;
  onSelectViolation: (violationId: string | null) => void;
  onSelectStudent: (studentId: string | null) => void;
  onOpenFormTab: (formTab: string, studentId?: string, violationId?: string) => void;
  violationReports: ViolationReportRecord[];
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
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  schoolSettings?: any;
}

export interface AvailableFormOption {
  id: 'model6' | 'model7' | 'model8' | 'model9' | 'model10' | 'model20';
  number: number;
  badge: string;
  tabKey: string;
  title: string;
  description: string;
  targetRole: string;
}

const AVAILABLE_FORMS: AvailableFormOption[] = [
  {
    id: 'model6',
    number: 6,
    badge: 'نموذج (6)',
    tabKey: 'model6-violation',
    title: 'تقرير مخالفة',
    description: 'توثيق الحادثة / الموقف ووصف الواقعة وتصنيف المخالفة والإجراء المتخذ واعتماد المدير',
    targetRole: 'المعلم والإدارة',
  },
  {
    id: 'model7',
    number: 7,
    badge: 'نموذج (7)',
    tabKey: 'model7-notice',
    title: 'تنبيه خطي / إشعار إلى ولي الأمر',
    description: 'إخطار خطي رسمي لولي الأمر بوقوع المخالفة السلوكية والتنبيه للحيلولة دون تكرارها',
    targetRole: 'طالب وولي أمر',
  },
  {
    id: 'model8',
    number: 8,
    badge: 'نموذج (8)',
    tabKey: 'model8-summon',
    title: 'خطاب استدعاء ولي الأمر',
    description: 'طلب حضور ولي الأمر للمدرسة لمقابلة الإدارة بموضوع يتعلق بسلوك الطالب',
    targetRole: 'ولي أمر',
  },
  {
    id: 'model9',
    number: 9,
    badge: 'نموذج (9)',
    tabKey: 'model9-warning',
    title: 'التنبيه الخطي من بعد الشفهي / إنذار وتعهد',
    description: 'تعهد كتابي من الطالب بالالتزام بعد ارتكاب سلوك غير إيجابي بعدم التكرار',
    targetRole: 'طالب',
  },
  {
    id: 'model10',
    number: 10,
    badge: 'نموذج (10)',
    tabKey: 'model10-commitment',
    title: 'تعهد ولي الأمر في حال تكرار المخالفات',
    description: 'تعهد والتزام ولي الأمر بمتابعة ابنه/ابنته وتوجيهه بعد تكرار المخالفات السلوكية',
    targetRole: 'ولي أمر',
  },
  {
    id: 'model20',
    number: 20,
    badge: 'نموذج (20)',
    tabKey: 'model20-deduction',
    title: 'إخطار بالحسم من درجة السلوك',
    description: 'إخطار رسمي بقرار حسم الدرجات بحسب اللائحة وتحديد مقترحات استرجاعها',
    targetRole: 'ولي أمر',
  },
];

export const FormsBundleEngine: React.FC<FormsBundleEngineProps> = ({
  students,
  violations,
  currentUser,
  activeStudent,
  selectedViolationId,
  onSelectViolation,
  onSelectStudent,
  onOpenFormTab,
  violationReports,
  parentNoticeForms = [],
  parentSummonForms = [],
  warningForms = [],
  parentCommitmentForms = [],
  m20Forms = [],
  onSaveViolationReport,
  onSaveNoticeForm,
  onSaveSummonForm,
  onSaveWarningForm,
  onSaveCommitmentForm,
  onSaveM20,
  onShowToast,
  schoolSettings = {},
}) => {
  // Selected violations for the current student
  const studentViolations = useMemo(() => {
    if (!activeStudent) return [];
    return violations.filter(
      (v) =>
        v.studentId === activeStudent.id ||
        (activeStudent.studentNumber && v.studentNumber === activeStudent.studentNumber)
    );
  }, [violations, activeStudent]);

  // The active violation selected for this bundle
  const activeViolation = useMemo(() => {
    if (!selectedViolationId) return studentViolations[0] || null;
    return (
      violations.find((v) => v.id === selectedViolationId) ||
      studentViolations[0] ||
      null
    );
  }, [violations, selectedViolationId, studentViolations]);

  // Selected models checkboxes (Strictly user-driven: empty by default, no guesswork)
  const [selectedFormKeys, setSelectedFormKeys] = useState<string[]>([]);

  // Toggle selection of a form model
  const toggleFormSelection = (formId: string) => {
    setSelectedFormKeys((prev) =>
      prev.includes(formId) ? prev.filter((k) => k !== formId) : [...prev, formId]
    );
  };

  // Select all or none
  const handleSelectAllForms = () => {
    if (selectedFormKeys.length === AVAILABLE_FORMS.length) {
      setSelectedFormKeys([]);
    } else {
      setSelectedFormKeys(AVAILABLE_FORMS.map((f) => f.id));
    }
  };

  // Shared Fields Modal state
  const [isSharedFieldsModalOpen, setIsSharedFieldsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Shared Fields State (Pre-filled from violation & student)
  const [sharedIncidentDate, setSharedIncidentDate] = useState('');
  const [sharedIncidentTime, setSharedIncidentTime] = useState('08:30 صباحاً');
  const [sharedLocation, setSharedLocation] = useState('الصف');
  const [sharedSituation, setSharedSituation] = useState('الحصة الدراسية');
  const [sharedTeacherName, setSharedTeacherName] = useState(
    currentUser?.fullName || currentUser?.displayName || ''
  );
  const [sharedOracleNumber, setSharedOracleNumber] = useState(
    (currentUser as any)?.oracleNumber || ''
  );
  const [sharedDescription, setSharedDescription] = useState('');
  const [sharedAction, setSharedAction] = useState('');
  const [sharedDegree, setSharedDegree] = useState('الدرجة الأولى (بسيطة)');

  // Initialize shared fields when activeViolation changes
  const populateSharedFields = (v: ViolationRecord | null) => {
    if (!v) {
      setSharedIncidentDate(getUaeTodayDateString());
      setSharedLocation('الصف');
      setSharedDescription('');
      setSharedAction('');
      setSharedDegree('الدرجة الأولى (بسيطة)');
      return;
    }
    setSharedIncidentDate(
      v.incidentDateTime ? v.incidentDateTime.split(' ')[0] : getUaeTodayDateString()
    );
    if (v.incidentDateTime && v.incidentDateTime.includes(' ')) {
      const parts = v.incidentDateTime.split(' ');
      if (parts.length > 1) {
        setSharedIncidentTime(parts.slice(1).join(' '));
      }
    }
    setSharedLocation(v.incidentLocation || 'الصف');
    setSharedDescription(v.incidentDescription || v.violationType || '');
    setSharedAction(v.suggestedAction || 'توجيه شفهي وتوثيق بالنموذج الرسمي');
    setSharedDegree(v.violationDegree || 'الدرجة الأولى (بسيطة)');
    if (v.reportingPerson) {
      setSharedTeacherName(v.reportingPerson);
    }
  };

  // Open the shared fields review modal
  const handleOpenSharedFieldsReview = () => {
    if (selectedFormKeys.length === 0) {
      onShowToast('يرجى تحديد نموذج رسمي واحد على الأقل لإنشائه', 'warning');
      return;
    }
    populateSharedFields(activeViolation);
    setIsSharedFieldsModalOpen(true);
  };

  // Linked existing documents for the active violation
  const linkedDocuments = useMemo(() => {
    if (!activeViolation) return [];
    const docs: Array<{
      id: string;
      modelNumber: number;
      badge: string;
      title: string;
      tabKey: string;
      date: string;
      isSigned: boolean;
      status: string;
      rawRecord: any;
    }> = [];

    // Model 6
    const r6 = violationReports.filter((r) => r.violationId === activeViolation.id);
    r6.forEach((r) => {
      const isSigned =
        !!r.signatures?.student?.signatureUrl ||
        !!r.signatures?.reporter?.signatureUrl ||
        !!r.studentSignature;
      docs.push({
        id: r.id,
        modelNumber: 6,
        badge: 'نموذج (6)',
        title: 'تقرير مخالفة',
        tabKey: 'model6-violation',
        date: r.incidentDate || r.createdAt || '',
        isSigned,
        status: isSigned ? 'تم التوقيع' : r.status || 'مسودة',
        rawRecord: r,
      });
    });

    // Model 7
    const r7 = parentNoticeForms.filter((f) => f.violationId === activeViolation.id);
    r7.forEach((f) => {
      const isSigned = !!f.studentSignature || !!f.parentSignature;
      docs.push({
        id: f.id,
        modelNumber: 7,
        badge: 'نموذج (7)',
        title: 'إشعار ولي أمر',
        tabKey: 'model7-notice',
        date: f.incidentDate || f.createdAt || '',
        isSigned,
        status: isSigned ? 'تم التوقيع' : f.status || 'مسودة',
        rawRecord: f,
      });
    });

    // Model 8
    const r8 = parentSummonForms.filter((f) => (f as any).violationId === activeViolation.id);
    r8.forEach((f) => {
      const isSigned = !!f.studentSignature || !!f.parentSignature;
      docs.push({
        id: f.id,
        modelNumber: 8,
        badge: 'نموذج (8)',
        title: 'استدعاء ولي أمر',
        tabKey: 'model8-summon',
        date: f.summonDate || f.createdAt || '',
        isSigned,
        status: isSigned ? 'تم التوقيع' : f.status || 'مسودة',
        rawRecord: f,
      });
    });

    // Model 9
    const r9 = warningForms.filter((f) => (f as any).violationId === activeViolation.id);
    r9.forEach((f) => {
      const isSigned = !!f.studentSignature || !!f.parentSignature;
      docs.push({
        id: f.id,
        modelNumber: 9,
        badge: 'نموذج (9)',
        title: 'إنذار وتعهد',
        tabKey: 'model9-warning',
        date: f.formDate || f.createdAt || '',
        isSigned,
        status: isSigned ? 'تم التوقيع' : f.status || 'مسودة',
        rawRecord: f,
      });
    });

    // Model 10
    const r10 = parentCommitmentForms.filter((f) => f.violationIds?.includes(activeViolation.id));
    r10.forEach((f) => {
      const isSigned = !!f.parentSignature;
      docs.push({
        id: f.id,
        modelNumber: 10,
        badge: 'نموذج (10)',
        title: 'تعهد ولي أمر',
        tabKey: 'model10-commitment',
        date: f.createdAt || '',
        isSigned,
        status: isSigned ? 'تم التوقيع' : f.status || 'مسودة',
        rawRecord: f,
      });
    });

    // Model 20
    const r20 = m20Forms.filter((f) => f.violationId === activeViolation.id);
    r20.forEach((f) => {
      const isSigned = !!f.parentSignature;
      docs.push({
        id: f.id,
        modelNumber: 20,
        badge: 'نموذج (20)',
        title: 'إخطار حسم درجات',
        tabKey: 'model20-deduction',
        date: f.issueDate || f.createdAt || '',
        isSigned,
        status: isSigned ? 'تم التوقيع' : f.status || 'مسودة',
        rawRecord: f,
      });
    });

    return docs;
  }, [
    activeViolation,
    violationReports,
    parentNoticeForms,
    parentSummonForms,
    warningForms,
    parentCommitmentForms,
    m20Forms,
  ]);

  // Model 6 Print Modal
  const [printModel6ModalOpen, setPrintModel6ModalOpen] = useState(false);
  const [model6ToPrint, setModel6ToPrint] = useState<ViolationReportRecord | null>(null);

  // Active reviewing tab among linked documents
  const [activeLinkedDocIndex, setActiveLinkedDocIndex] = useState(0);

  // Final generation execution (Creates independent documents linked to violationId)
  const handleConfirmGenerateBundle = async () => {
    if (!activeStudent || !activeViolation) {
      onShowToast('يرجى تحديد الطالب والواقعة السلوكية أولاً', 'error');
      return;
    }

    setIsGenerating(true);
    const createdCount = selectedFormKeys.length;
    const settings: Record<string, any> = schoolSettings || {};

    try {
      // 1. Model 6: تقرير مخالفة
      if (selectedFormKeys.includes('model6') && onSaveViolationReport) {
        const vrDoc: ViolationReportRecord = {
          id: `VR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reportNumber: `VR-${settings.schoolId || 'SCH'}-${new Date().getFullYear()}-${Math.floor(
            Math.random() * 9000 + 1000
          )}`,
          formType: 'violation_report',
          formNumber: 6,
          schoolId: settings.schoolId || 'alkhalil-school',
          schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          studentId: activeStudent.id,
          studentNumber: activeStudent.studentNumber,
          studentName: activeStudent.fullName,
          grade: activeStudent.grade as any,
          section: activeStudent.section as any,
          track: activeStudent.track as any,
          violationId: activeViolation.id,
          violationCode: activeViolation.violationsList?.[0]?.code || '6.1',
          violationName: activeViolation.violationType,
          violationLevel: sharedDegree.includes('الرابعة')
            ? 'الرابعة – شديدة الخطورة'
            : sharedDegree.includes('الثالثة')
            ? 'الثالثة – خطيرة'
            : sharedDegree.includes('الثانية')
            ? 'الثانية – متوسطة الخطورة'
            : 'الأولى – بسيطة',
          suggestedDeduction: activeViolation.totalDeductionMarks
            ? `${activeViolation.totalDeductionMarks} درجات`
            : '',
          occurrenceCount: 1,
          incidentDate: sharedIncidentDate,
          incidentTime: sharedIncidentTime,
          incidentSituation: sharedSituation,
          incidentPlace: sharedLocation,
          period: 'الأولى',
          subject: 'التربية الأخلاقية',
          teacherName: sharedTeacherName,
          reportedBy: sharedTeacherName,
          reporterRole: currentUser?.jobTitle || 'معلم المادة',
          oracleNumber: sharedOracleNumber,
          principalName: settings.principalName || 'مدير المدرسة',
          description: sharedDescription,
          immediateAction: sharedAction,
          studentStatement: '',
          studentAdmitted: false,
          witnesses: '',
          witnessStatements: '',
          damageOrInjury: false,
          damageOrInjuryDetails: '',
          attachments: [],
          counselorNotes: 'تم إنشاء النموذج عبر حزمة النماذج الرسمية الموحدة.',
          signatures: {},
          status: 'مسودة',
          academicYear: '2025-2026',
          term: 'الفصل الدراسي الأول',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveViolationReport(vrDoc);
      }

      // 2. Model 7: إشعار ولي أمر
      if (selectedFormKeys.includes('model7') && onSaveNoticeForm) {
        const pnDoc: ParentNoticeFormRecord = {
          id: `PN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          formType: 'parent_notice_form',
          formNumber: 7,
          noticeType: 'تنبيه خطي',
          schoolId: settings.schoolId || 'alkhalil-school',
          emirate: 'الفجيرة',
          operationsManagement: 'إدارة العمليات المدرسية',
          council: 'مجلس 1',
          sector: 'نطاق 2',
          schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          studentId: activeStudent.id,
          studentNumber: activeStudent.studentNumber,
          studentName: activeStudent.fullName,
          grade: activeStudent.grade as any,
          section: activeStudent.section as any,
          parentName: activeStudent.parentName || 'ولي الأمر',
          parentPhone: activeStudent.parentPhone || '',
          incidentDay: 'الرسمي',
          incidentDate: sharedIncidentDate,
          violationDetails: sharedDescription,
          violationId: activeViolation.id,
          officerName: sharedTeacherName,
          principalName: settings.principalName || 'مدير المدرسة',
          issueDate: sharedIncidentDate,
          status: 'مسودة',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveNoticeForm(pnDoc);
      }

      // 3. Model 8: استدعاء ولي أمر
      if (selectedFormKeys.includes('model8') && onSaveSummonForm) {
        const psDoc: ParentSummonFormRecord = {
          id: `PS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          schoolId: settings.schoolId || 'alkhalil-school',
          studentId: activeStudent.id,
          studentNumber: activeStudent.studentNumber,
          studentName: activeStudent.fullName,
          grade: activeStudent.grade as any,
          section: activeStudent.section as any,
          parentName: activeStudent.parentName || 'ولي الأمر',
          parentPhone: activeStudent.parentPhone || '',
          parentRelation: 'أب',
          summonReason: sharedDescription,
          summonDate: sharedIncidentDate,
          summonTime: '09:00 صباحاً',
          interviewDate: sharedIncidentDate,
          interviewTime: '09:00 صباحاً',
          counselorName: sharedTeacherName,
          status: 'مسودة',
          recordedBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any;
        (psDoc as any).violationId = activeViolation.id;
        await onSaveSummonForm(psDoc);
      }

      // 4. Model 9: إنذار خطي وتعهد
      if (selectedFormKeys.includes('model9') && onSaveWarningForm) {
        const wfDoc: WarningFormRecord = {
          id: `WF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: activeStudent.id,
          studentNumber: activeStudent.studentNumber,
          studentName: activeStudent.fullName,
          grade: activeStudent.grade as any,
          section: activeStudent.section as any,
          emirate: 'الفجيرة',
          council: 'مجلس 1',
          sector: 'نطاق 2',
          school: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
          priorBehaviors: [sharedDescription, '', ''],
          studentPledge: 'أتعهد بعدم تكرار المخالفة والالتزام التام باللائحة السلوكية المدرسية.',
          formDate: sharedIncidentDate,
          counselorName: sharedTeacherName,
          actionTaken: sharedAction,
          parentPhone: activeStudent.parentPhone || '',
          parentName: activeStudent.parentName || '',
          parentRelation: 'ولي أمر',
          communicationDateTime: sharedIncidentDate,
          communicationResult: 'تم إخطار ولي الأمر بالواقعة والإجراء',
          studentAttestation: false,
          isParentSignatureRecorded: false,
          status: 'مسودة',
          recordedBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        (wfDoc as any).violationId = activeViolation.id;
        onSaveWarningForm(wfDoc);
      }

      // 5. Model 10: تعهد ولي الأمر
      if (selectedFormKeys.includes('model10') && onSaveCommitmentForm) {
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
          studentId: activeStudent.id,
          studentNumber: activeStudent.studentNumber,
          studentName: activeStudent.fullName,
          grade: activeStudent.grade as any,
          section: activeStudent.section as any,
          parentName: activeStudent.parentName || 'ولي الأمر',
          parentPhone: activeStudent.parentPhone || '',
          violationsList: [sharedDescription],
          violationIds: [activeViolation.id],
          vicePrincipalName: 'مساعد مدير المدرسة',
          issueDate: sharedIncidentDate,
          status: 'مسودة',
          createdBy: currentUser?.fullName || 'النظام',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveCommitmentForm(pcDoc);
      }

      // 6. Model 20: إخطار حسم درجات
      if (selectedFormKeys.includes('model20') && onSaveM20) {
        const bdnDoc: BehaviorDeductionNoticeRecord = {
          id: `BDN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          formType: 'behavior_deduction_notice',
          formNumber: 20,
          schoolId: settings.schoolId || 'alkhalil-school',
          studentId: activeStudent.id,
          studentNumber: activeStudent.studentNumber,
          studentName: activeStudent.fullName,
          grade: activeStudent.grade as any,
          section: activeStudent.section as any,
          parentName: activeStudent.parentName || 'ولي الأمر',
          parentPhone: activeStudent.parentPhone || '',
          violationDegree: sharedDegree,
          violationDescription: sharedDescription,
          committeeDecisionNumber: '1',
          committeeDecisionDate: sharedIncidentDate,
          deductedMarks: activeViolation.totalDeductionMarks || 4,
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
        (bdnDoc as any).violationId = activeViolation.id;
        await onSaveM20(bdnDoc);
      }

      setIsSharedFieldsModalOpen(false);
      setSelectedFormKeys([]);
      onShowToast(
        `تم توليد ${createdCount} مستندات رسمية وربطها بالواقعة السلوكية بنجاح دون أي تكرار للمخالفة أو خصم الدرجات`,
        'success'
      );
    } catch (err: any) {
      onShowToast('حدث خطأ أثناء توليد بعض المستندات: ' + (err.message || ''), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Bundle Header & Safety Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-[#0C2340] to-teal-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#D4AF37]" />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                محرك حزمة النماذج الرسمية للواقعة السلوكية
              </h2>
              <span className="text-[11px] font-bold text-[#D4AF37] bg-white/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                القرار الوزاري (851)
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
              إنشاء حزمة من النماذج الرسمية المتعددة لواقعة سلوكية واحدة بمراجعة موحدة للحقول المشتركة،
              مع توليد مستند مستقل لكل نموذج وربطه بالواقعة بدون تكرار المخالفة أو إعادة خصم درجات السلوك.
            </p>
          </div>

          {/* Safety Guarantee Pill */}
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-3 text-xs flex items-start gap-2.5 max-w-md shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-300 block">ضمانة عدم تكرار الخصم:</span>
              <p className="text-[11px] text-emerald-100/90 leading-tight">
                المستندات المنشأة هنا ترتبط بنفس معرف المخالفة (<code className="font-mono text-emerald-200">violationId</code>)
                ولا تُنشئ أي مخالفة جديدة ولا تخصم أي درجات إضافية.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STAGE 1 & 2: ACTIVE STUDENT & INCIDENT SELECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Student Info (4 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#006D77]" />
              <span>الطالب المعني بالحزمة</span>
            </span>
            {activeStudent && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                تم التحديد
              </span>
            )}
          </div>

          {activeStudent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  {activeStudent.fullName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-sm text-slate-900 truncate">
                    {activeStudent.fullName}
                  </h4>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>#{activeStudent.studentNumber}</span>
                    <span>•</span>
                    <span className="font-sans">الصف {activeStudent.grade} ({activeStudent.section})</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-bold">المسار:</span>
                  <span className="font-bold text-slate-800">{activeStudent.track || 'عام'}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-bold">ولي الأمر:</span>
                  <span className="font-bold text-slate-800 truncate block" title={activeStudent.parentName}>
                    {activeStudent.parentName || 'ولي الأمر'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              لم يتم اختيار طالب بعد. يرجى اختيار طالب من القائمة أعلاه لبدء الحزمة.
            </div>
          )}
        </div>

        {/* Active Incident / Violation Selection (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-slate-900">
                الواقعة السلوكية المرتبطة بالحزمة ({studentViolations.length} مسجلة)
              </span>
            </div>
            {studentViolations.length > 1 && (
              <span className="text-[11px] text-slate-500 font-medium">
                اختر الواقعة لربط النماذج بها
              </span>
            )}
          </div>

          {studentViolations.length === 0 ? (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">لا توجد مخالفات مسجلة مسبقاً لهذا الطالب:</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يمكنك إنشاء نموذج رقم (6) أو نماذج التعهد مباشرة وسيقوم النظام بربطها تلقائياً،
                  أو يمكنك تسجيل المخالفة من صفحة «سجل المخالفات» أولاً.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {studentViolations.map((v) => {
                const isSelected = activeViolation?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectViolation(v.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-teal-50/80 border-[#006D77] shadow-xs ring-1 ring-[#006D77]/20'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-xs">{v.violationType}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          {v.violationDegree}
                        </span>
                        {v.totalDeductionMarks ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            حسم {v.totalDeductionMarks}د
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {v.incidentDateTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {v.incidentLocation}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {isSelected ? (
                        <span className="text-[11px] font-bold text-[#006D77] flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>الواقعة المحددة</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 hover:text-slate-800">
                          اختيار هذه الواقعة ⟵
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* STAGE 3: OFFICIAL FORMS SELECTION (CHECKBOXES - STRICT USER CHOICE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#006D77] text-white flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <span>اختر النماذج الرسمية المطلوب إنشاؤها لهذه الواقعة</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تطبيقاً لضوابط اللائحة الرسمية: الاختيار متروك بالكامل للمستخدم دون فرض أي نماذج مقترحة.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSelectAllForms}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              {selectedFormKeys.length === AVAILABLE_FORMS.length ? 'إلغاء تحديد الكل' : 'تحديد جميع النماذج'}
            </button>
          </div>
        </div>

        {/* Checkbox Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVAILABLE_FORMS.map((form) => {
            const isChecked = selectedFormKeys.includes(form.id);
            return (
              <div
                key={form.id}
                onClick={() => toggleFormSelection(form.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'bg-teal-50/70 border-[#006D77] shadow-xs ring-2 ring-[#006D77]/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by div click
                  className="mt-1 w-4 h-4 rounded text-[#006D77] focus:ring-[#006D77] border-slate-300 pointer-events-none"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#0C2340] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {form.badge}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      {form.targetRole}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-snug">
                    {form.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2">
                    {form.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bundle Generation Trigger Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            تم تحديد <span className="font-black text-[#006D77] text-sm">{selectedFormKeys.length}</span> نماذج رسمية للتوليد.
          </div>

          <button
            type="button"
            onClick={handleOpenSharedFieldsReview}
            disabled={selectedFormKeys.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              selectedFormKeys.length > 0
                ? 'bg-gradient-to-r from-[#006D77] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-teal-900/20 active:scale-98'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>
              {selectedFormKeys.length > 1
                ? `مراجعة الحقول المشتركة وإنشاء الحزمة (${selectedFormKeys.length} نماذج)`
                : selectedFormKeys.length === 1
                ? 'مراجعة الحقول وإنشاء النموذج المختار'
                : 'حدد نموذجاً للبدء'}
            </span>
          </button>
        </div>
      </div>

      {/* STAGE 4: TOP TABS WITH COMPLETION BADGES FOR EXISTING / GENERATED FORMS */}
      {linkedDocuments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-mono font-bold">
                ✓
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                النماذج الرسمية المنشأة لهذه الواقعة ({linkedDocuments.length} مستندات مستقلة)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              اضغط على تبويب أي نموذج لمراجعته أو طباعته أو استكمال توقيعاته
            </span>
          </div>

          {/* Top Tabs with Completion Status Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {linkedDocuments.map((doc, idx) => {
              const isSelected = activeLinkedDocIndex === idx;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveLinkedDocIndex(idx)}
                  className={`px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 shrink-0 font-bold ${
                    isSelected
                      ? 'bg-[#0C2340] text-white border-[#0C2340] shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="font-mono text-[11px] text-[#D4AF37] font-black">
                    {doc.badge}
                  </span>
                  <span>{doc.title}</span>

                  {/* Completion Status Indicator */}
                  {doc.isSigned ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ✓ معتمد وموقّع
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      ! بانتظار التوقيع
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Document Details & Action Bar */}
          {linkedDocuments[activeLinkedDocIndex] && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-900 text-sm">
                    {linkedDocuments[activeLinkedDocIndex].title} ({linkedDocuments[activeLinkedDocIndex].badge})
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    المعرف: #{linkedDocuments[activeLinkedDocIndex].id}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  التاريخ: {linkedDocuments[activeLinkedDocIndex].date} • الحالة:{' '}
                  <span className="font-bold text-slate-800">
                    {linkedDocuments[activeLinkedDocIndex].status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* If Model 6: Direct 1-Click Print A4 Button */}
                {linkedDocuments[activeLinkedDocIndex].modelNumber === 6 && (
                  <button
                    type="button"
                    onClick={() => {
                      setModel6ToPrint(linkedDocuments[activeLinkedDocIndex].rawRecord);
                      setPrintModel6ModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>طباعة نموذج (6) الرسمي A4</span>
                  </button>
                )}

                {/* Open in Dedicated Tab */}
                <button
                  type="button"
                  onClick={() =>
                    onOpenFormTab(
                      linkedDocuments[activeLinkedDocIndex].tabKey,
                      activeStudent?.id,
                      activeViolation?.id
                    )
                  }
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>فتح القالب المستقل والتوقيع</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHARED FIELDS REVIEW MODAL (BEFORE GENERATION) */}
      {isSharedFieldsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-right"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#006D77]" />
                  <span>مراجعة الحقول المشتركة قبل توليد الحزمة</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  تتم مراجعة وتعديل هذه البيانات المشتركة مرة واحدة وتوريدها لكافة النماذج المختارة ({selectedFormKeys.length} نماذج)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSharedFieldsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Student read-only bar */}
              {activeStudent && (
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{activeStudent.fullName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      #{activeStudent.studentNumber} • الصف {activeStudent.grade}/{activeStudent.section}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    بيانات الطالب معتمدة
                  </span>
                </div>
              )}

              {/* Grid of shared fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الحدوث:</label>
                  <input
                    type="date"
                    value={sharedIncidentDate}
                    onChange={(e) => setSharedIncidentDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">وقت الحدوث:</label>
                  <input
                    type="text"
                    value={sharedIncidentTime}
                    onChange={(e) => setSharedIncidentTime(e.target.value)}
                    placeholder="مثال: 08:30 صباحاً"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">مكان حدوث الموقف:</label>
                  <input
                    type="text"
                    value={sharedLocation}
                    onChange={(e) => setSharedLocation(e.target.value)}
                    placeholder="مثال: الصف، الممر، الساحة..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الموقف / التوقيت:</label>
                  <input
                    type="text"
                    value={sharedSituation}
                    onChange={(e) => setSharedSituation(e.target.value)}
                    placeholder="مثال: الحصة الدراسية، طابور الصباح..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المعلم / محرر المخالفة:</label>
                  <input
                    type="text"
                    value={sharedTeacherName}
                    onChange={(e) => setSharedTeacherName(e.target.value)}
                    placeholder="اسم المعلم أو محرر البلاغ"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الأوراكل:</label>
                  <input
                    type="text"
                    value={sharedOracleNumber}
                    onChange={(e) => setSharedOracleNumber(e.target.value)}
                    placeholder="رقم الأوراكل الوظيفي"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">درجة المخالفة والتصنيف:</label>
                <select
                  value={sharedDegree}
                  onChange={(e) => setSharedDegree(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="الدرجة الأولى (بسيطة)">الدرجة الأولى (بسيطة)</option>
                  <option value="الدرجة الثانية (متوسطة الخطورة)">الدرجة الثانية (متوسطة الخطورة)</option>
                  <option value="الدرجة الثالثة (خطيرة)">الدرجة الثالثة (خطيرة)</option>
                  <option value="الدرجة الرابعة (شديدة الخطورة)">الدرجة الرابعة (شديدة الخطورة)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  وصف التصرف / الحادثة / الموقف:
                </label>
                <textarea
                  rows={3}
                  value={sharedDescription}
                  onChange={(e) => setSharedDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs leading-relaxed"
                  placeholder="وصف موضوعي دقيق للواقعة السلوكية..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الإجراء المتخذ:
                </label>
                <textarea
                  rows={2}
                  value={sharedAction}
                  onChange={(e) => setSharedAction(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs leading-relaxed"
                  placeholder="الإجراء التربوي المتخذ وفق اللائحة..."
                />
              </div>

              {/* Target Models Preview List */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 block">
                  النماذج التي سيتم إنشاؤها ({selectedFormKeys.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFormKeys.map((k) => {
                    const f = AVAILABLE_FORMS.find((x) => x.id === k);
                    return (
                      <span
                        key={k}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-bold text-[11px] text-[#006D77]"
                      >
                        ✓ {f?.badge} - {f?.title}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSharedFieldsModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold cursor-pointer"
              >
                رجوع وتعديل الاختيار
              </button>

              <button
                type="button"
                onClick={handleConfirmGenerateBundle}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-gradient-to-r from-[#006D77] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-black rounded-xl cursor-pointer shadow-md flex items-center gap-2"
              >
                {isGenerating ? (
                  <span>جاري توليد المستندات...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>تأكيد وتوليد المستندات وربطها بالواقعة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODEL 6 PRINT MODAL */}
      {printModel6ModalOpen && model6ToPrint && (
        <PrintViolationReportModal
          isOpen={printModel6ModalOpen}
          onClose={() => setPrintModel6ModalOpen(false)}
          report={model6ToPrint}
        />
      )}
    </div>
  );
};
