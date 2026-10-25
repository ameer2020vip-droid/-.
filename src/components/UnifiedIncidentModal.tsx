import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  FileSignature,
  FileText,
  AlertTriangle,
  Scale,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Search,
  Printer,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  PenTool,
  RotateCcw,
  Check,
  Eye,
  Layers,
  Loader2,
  Edit3,
} from 'lucide-react';
import { rephraseIncidentWithAI, RephraseResult } from '../utils/aiRephrase';
import {
  Student,
  ViolationRecord,
  ViolationDegree,
  WarningFormRecord,
  ParentNoticeFormRecord,
  ParentSummonFormRecord,
  ParentCommitmentFormRecord,
  ViolationReportRecord,
  BehaviorDeductionNoticeRecord,
  DeviceConfiscationRecord,
  AttendanceCommitmentRecord,
  CounselorUser,
  AppUser,
} from '../types';
import {
  BYLAW_VIOLATIONS_CATALOG,
  BylawViolationItem,
  OFFICIAL_BYLAW_FORMS,
  OfficialBylawFormDef,
} from '../data/bylawData';
import { getUaeCurrentDateString, getUaeCurrentTimeString } from '../utils/time';
import { GradeSectionStudentSelectorModal } from './GradeSectionStudentSelectorModal';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

export interface IncidentViolationItem {
  id: string;
  catalogItem: BylawViolationItem;
  repetition: 'حال ارتكابها' | 'تكرار للمرة الأولى' | 'تكرار للمرة الثانية' | 'تكرار للمرة الثالثة' | 'أكثر من 3 مرات';
  deductionMarks: number;
  specificNotes?: string;
}

export interface UnifiedIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudentId?: string | null;
  initialViolationCode?: string | null;
  counselor?: CounselorUser | AppUser | null;
  onSaveUnifiedIncident: (data: {
    incidentRecord: ViolationRecord;
    createdWarningForm?: WarningFormRecord;
    createdNoticeForm?: ParentNoticeFormRecord;
    createdSummonForm?: ParentSummonFormRecord;
    createdCommitmentForm?: ParentCommitmentFormRecord;
    createdViolationReport?: ViolationReportRecord;
    createdDeductionNotice?: BehaviorDeductionNoticeRecord;
    createdConfiscation?: DeviceConfiscationRecord;
    createdAttendanceCommitment?: AttendanceCommitmentRecord;
  }) => Promise<void>;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onOpenStudentProfile?: (studentId: string) => void;
}

export const UnifiedIncidentModal: React.FC<UnifiedIncidentModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudentId,
  initialViolationCode,
  counselor,
  onSaveUnifiedIncident,
  onShowToast = (_msg: string = '', _type?: string) => {},
  onOpenStudentProfile,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Wizard Steps: 1: Student & Incident, 2: Violations list, 3: Forms selection, 4: Unified Signatures, 5: Review & Save
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Student Selection
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [isGradeSelectorOpen, setIsGradeSelectorOpen] = useState<boolean>(false);

  // General Incident Details
  const [incidentDate, setIncidentDate] = useState<string>(getUaeCurrentDateString());
  const [incidentTime, setIncidentTime] = useState<string>(getUaeCurrentTimeString());
  const [incidentPlace, setIncidentPlace] = useState<string>('الصف الدراسي');
  const [reportingPerson, setReportingPerson] = useState<string>(
    counselor?.fullName || counselor?.displayName || 'المرشد الأكاديمي'
  );
  const [reporterRole, setReporterRole] = useState<string>('المرشد الأكاديمي');
  const [incidentDescription, setIncidentDescription] = useState<string>('');
  const [actionTakenSummary, setActionTakenSummary] = useState<string>('');

  // Multi-violations in this single incident
  const [incidentViolations, setIncidentViolations] = useState<IncidentViolationItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedDegreeFilter, setSelectedDegreeFilter] = useState<string>('all');

  // Selected Forms checklist (Form Numbers, e.g. [6, 7, 8, 9, 10, 20])
  const [selectedFormNumbers, setSelectedFormNumbers] = useState<number[]>([6, 9]);

  // Signatures
  const [studentSignature, setStudentSignature] = useState<string>('');
  const [studentSignatureDate, setStudentSignatureDate] = useState<string>(getUaeCurrentDateString());
  const [parentSignature, setParentSignature] = useState<string>('');
  const [parentSignatureDate, setParentSignatureDate] = useState<string>(getUaeCurrentDateString());
  const [parentRefusedOrAbsent, setParentRefusedOrAbsent] = useState<boolean>(false);
  const [parentAbsentWitness, setParentAbsentWitness] = useState<string>('تم الإثبات بحضور المرشد الأكاديمي وضابط السلامة (المادة 17/3)');
  const [principalSignature, setPrincipalSignature] = useState<string>('');
  const [principalSignatureDate, setPrincipalSignatureDate] = useState<string>(getUaeCurrentDateString());
  const [principalName, setPrincipalName] = useState<string>('مدير المدرسة');

  // Canvas drawing states
  const studentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const parentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingStudent, setIsDrawingStudent] = useState<boolean>(false);
  const [isDrawingParent, setIsDrawingParent] = useState<boolean>(false);

  // Submission loading
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showBatchPrintPreview, setShowBatchPrintPreview] = useState<boolean>(false);

  // AI Rephrasing State (Drafting Assistant)
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<RephraseResult | null>(null);
  const [aiEditedText, setAiEditedText] = useState<string>('');
  const [originalDraftText, setOriginalDraftText] = useState<string>('');

  const handleTriggerAiRephrase = async () => {
    if (!incidentDescription.trim()) {
      onShowToast('يرجى كتابة وصف الموقف أو الحادثة أولاً ليتمكن الذكاء الاصطناعي من تحسين صياغتها', 'warning');
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await rephraseIncidentWithAI(incidentDescription, {
        location: incidentPlace,
        degree: incidentViolations[0]?.catalogItem?.degree || 'الدرجة الأولى (بسيطة)',
      });
      setOriginalDraftText(incidentDescription);
      setAiResult(result);
      setAiEditedText(result.improvedText);
      setIsAiModalOpen(true);
    } catch (err: any) {
      console.error('Error during AI rephrasing in UnifiedIncidentModal:', err);
      onShowToast('تعذر تحسين الصياغة حالياً، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiRephrase = () => {
    const textToApply = aiEditedText.trim() || aiResult?.improvedText || '';
    if (textToApply) {
      setIncidentDescription(textToApply);
      setIsAiModalOpen(false);
      onShowToast('تم اعتماد وتطبيق الصياغة الرسمية الموضوعية بنجاح في حقل وصف الحادثة', 'success');
    }
  };

  const handleRejectAiRephrase = () => {
    setIsAiModalOpen(false);
    onShowToast('تم الاحتفاظ بالصياغة الأصلية دون أي تعديل', 'info');
  };

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      if (initialStudentId) {
        setSelectedStudentId(initialStudentId);
      } else if (students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(students[0].id);
      }

      if (initialViolationCode) {
        const found = BYLAW_VIOLATIONS_CATALOG.find(
          (v) => v.code === initialViolationCode || v.id === initialViolationCode
        );
        if (found) {
          setIncidentViolations([
            {
              id: `vitem-${Date.now()}`,
              catalogItem: found,
              repetition: 'حال ارتكابها',
              deductionMarks: found.deductionFirstTime,
            },
          ]);
        }
      }
    }
  }, [isOpen, initialStudentId, initialViolationCode]);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Filtered students for quick search
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students.slice(0, 10);
    const q = studentSearchQuery.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.studentNumber && s.studentNumber.toLowerCase().includes(q)) ||
        (s.grade && s.grade.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [students, studentSearchQuery]);

  // Catalog filtered for violation picker
  const filteredCatalog = useMemo(() => {
    return BYLAW_VIOLATIONS_CATALOG.filter((item) => {
      if (selectedDegreeFilter !== 'all' && item.degree !== selectedDegreeFilter) return false;
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [selectedDegreeFilter, catalogSearch]);

  // Total deduction calculation
  const totalDeductionMarks = useMemo(() => {
    return incidentViolations.reduce((sum, v) => sum + (v.deductionMarks || 0), 0);
  }, [incidentViolations]);

  // Highest degree amongst selected violations
  const highestDegree = useMemo<ViolationDegree>(() => {
    if (incidentViolations.some((v) => v.catalogItem.degree === 'الدرجة الرابعة (شديدة الخطورة)')) {
      return 'الدرجة الرابعة (شديدة الخطورة)';
    }
    if (incidentViolations.some((v) => v.catalogItem.degree === 'الدرجة الثالثة (جسيمة)')) {
      return 'الدرجة الثالثة (جسيمة)';
    }
    if (incidentViolations.some((v) => v.catalogItem.degree === 'الدرجة الثانية (متوسطة)')) {
      return 'الدرجة الثانية (متوسطة)';
    }
    return 'الدرجة الأولى (بسيطة)';
  }, [incidentViolations]);

  // Helper to add violation from catalog
  const handleAddViolationToIncident = (item: BylawViolationItem) => {
    // Avoid exact duplicate
    if (incidentViolations.some((v) => v.catalogItem.code === item.code)) {
      onShowToast(`المخالفة ${item.code} مضافة بالفعل في هذه المعاملة`, 'info');
      return;
    }

    const newItem: IncidentViolationItem = {
      id: `vitem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      catalogItem: item,
      repetition: 'حال ارتكابها',
      deductionMarks: item.deductionFirstTime,
    };

    const updated = [...incidentViolations, newItem];
    setIncidentViolations(updated);

    // Auto-recommend forms based on added violations
    autoSuggestForms(updated);
    onShowToast(`تمت إضافة مخالفة (${item.code} - ${item.title.slice(0, 30)}...) للواقعة`, 'success');
  };

  // Helper to remove violation from incident
  const handleRemoveViolation = (id: string) => {
    const updated = incidentViolations.filter((v) => v.id !== id);
    setIncidentViolations(updated);
    autoSuggestForms(updated);
  };

  // Change repetition & update marks
  const handleUpdateRepetition = (id: string, rep: IncidentViolationItem['repetition']) => {
    setIncidentViolations((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let marks = 0;
        if (item.catalogItem.degree === 'الدرجة الأولى (بسيطة)') {
          if (rep === 'حال ارتكابها' || rep === 'تكرار للمرة الأولى') marks = 0;
          else if (rep === 'تكرار للمرة الثانية') marks = 2;
          else marks = 4;
        } else if (item.catalogItem.degree === 'الدرجة الثانية (متوسطة)') {
          if (rep === 'حال ارتكابها') marks = 4;
          else marks = 8;
        } else if (item.catalogItem.degree === 'الدرجة الثالثة (جسيمة)') {
          marks = 12;
        } else {
          marks = 20;
        }
        return { ...item, repetition: rep, deductionMarks: marks };
      })
    );
  };

  // Auto suggest forms according to Ministerial Resolution 851
  const autoSuggestForms = (violationsList: IncidentViolationItem[]) => {
    const formsSet = new Set<number>([6]); // Model 6 (Violation report) is always essential

    const hasDeg1 = violationsList.some((v) => v.catalogItem.degree === 'الدرجة الأولى (بسيطة)');
    const hasDeg2 = violationsList.some((v) => v.catalogItem.degree === 'الدرجة الثانية (متوسطة)');
    const hasDeg3 = violationsList.some((v) => v.catalogItem.degree === 'الدرجة الثالثة (جسيمة)');
    const hasDeg4 = violationsList.some((v) => v.catalogItem.degree === 'الدرجة الرابعة (شديدة الخطورة)');

    const hasPhone = violationsList.some((v) => v.catalogItem.code === '2.7' || v.catalogItem.title.includes('هاتف'));
    const hasAbsence = violationsList.some((v) => v.catalogItem.code === '2.1' || v.catalogItem.title.includes('تغيب'));

    if (hasDeg1) {
      formsSet.add(9); // Model 9: Student written warning & commitment
      formsSet.add(7); // Model 7: Parent notice
    }
    if (hasDeg2) {
      formsSet.add(7); // Model 7: Notice
      formsSet.add(8); // Model 8: Summon parent
      formsSet.add(9); // Model 9: Student pledge
      formsSet.add(10); // Model 10: Parent commitment
      formsSet.add(20); // Model 20: Mark deduction notice
    }
    if (hasDeg3) {
      formsSet.add(7);
      formsSet.add(8);
      formsSet.add(10);
      formsSet.add(12); // Model 12: Temporary suspension
      formsSet.add(15); // Model 15: Referral
      formsSet.add(20);
    }
    if (hasDeg4) {
      formsSet.add(8);
      formsSet.add(16); // Model 16: Expulsion until end of term
    }
    if (hasPhone) {
      formsSet.add(24); // Model 24: Device confiscation
    }
    if (hasAbsence) {
      formsSet.add(27); // Model 27: Attendance commitment
    }

    setSelectedFormNumbers(Array.from(formsSet));
  };

  const toggleFormSelection = (formNumber: number) => {
    setSelectedFormNumbers((prev) =>
      prev.includes(formNumber) ? prev.filter((n) => n !== formNumber) : [...prev, formNumber]
    );
  };

  // Canvas drawing handlers for Student
  const handleStudentCanvasDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = studentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawingStudent(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0C2340';
  };

  const handleStudentCanvasMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingStudent) return;
    const canvas = studentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleStudentCanvasUp = () => {
    if (!isDrawingStudent) return;
    setIsDrawingStudent(false);
    const canvas = studentCanvasRef.current;
    if (canvas) {
      setStudentSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearStudentCanvas = () => {
    const canvas = studentCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStudentSignature('');
  };

  // Canvas drawing handlers for Parent
  const handleParentCanvasDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = parentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawingParent(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0C2340';
  };

  const handleParentCanvasMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingParent) return;
    const canvas = parentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleParentCanvasUp = () => {
    if (!isDrawingParent) return;
    setIsDrawingParent(false);
    const canvas = parentCanvasRef.current;
    if (canvas) {
      setParentSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearParentCanvas = () => {
    const canvas = parentCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setParentSignature('');
  };

  // Apply default simulated signature for testing if needed
  const applyQuickDemoSignatures = () => {
    const makeSvgData = (text: string) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="10" y="50" font-family="Arial" font-size="22" font-weight="bold" fill="#0C2340">${text}</text></svg>`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };
    if (!studentSignature) setStudentSignature(makeSvgData(selectedStudent?.fullName || 'توقيع الطالب'));
    if (!parentSignature && !parentRefusedOrAbsent) setParentSignature(makeSvgData(selectedStudent?.guardianName || 'توقيع ولي الأمر'));
    if (!principalSignature) setPrincipalSignature(makeSvgData(principalName));
    onShowToast('تم توليد توقيع إلكتروني تجريبي سريع لكافة الأطراف', 'info');
  };

  // Save the entire unified incident and its linked forms
  const handleSaveAndCommit = async () => {
    if (!selectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'error');
      setCurrentStep(1);
      return;
    }

    if (incidentViolations.length === 0) {
      onShowToast('يرجى إضافة مخالفة واحدة على الأقل في هذه المعاملة', 'error');
      setCurrentStep(2);
      return;
    }

    setIsSaving(true);
    try {
      const schoolId = counselor?.schoolId || 'alkhalil-school';
      const timestamp = Date.now();
      const incidentId = `INC-${schoolId}-${timestamp}`;

      // Build unified violation title & description
      const violationTitles = incidentViolations.map((v) => `[${v.catalogItem.code}] ${v.catalogItem.title}`);
      const combinedTitle =
        incidentViolations.length === 1
          ? incidentViolations[0].catalogItem.title
          : `مخالفة مجمعة (${incidentViolations.length} مخالفات): ${incidentViolations[0].catalogItem.title}`;

      const fullDescription = incidentDescription.trim()
        ? `${incidentDescription}\n\nالمخالفات المرصودة:\n` +
          incidentViolations.map((v, i) => `${i + 1}. [رمز ${v.catalogItem.code}]: ${v.catalogItem.title} (${v.repetition} - حسم ${v.deductionMarks} درجات)`).join('\n')
        : 'رصد مخالفات سلوكية مجمعة بموجب القرار الوزاري رقم 851 لسنة 2018:\n' +
          incidentViolations.map((v, i) => `${i + 1}. [رمز ${v.catalogItem.code}]: ${v.catalogItem.title} (${v.repetition} - حسم ${v.deductionMarks} درجات)`).join('\n');

      const linkedFormNames = selectedFormNumbers.map((n) => `نموذج ${n}`);

      // 1. Unified Master Violation Record (المخالفة الواحدة الشاملة)
      const unifiedViolationRecord: ViolationRecord = {
        id: incidentId,
        studentId: selectedStudent.id,
        studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
        studentName: selectedStudent.fullName,
        grade: selectedStudent.grade,
        section: selectedStudent.section,
        violationType: combinedTitle,
        violationDegree: highestDegree,
        incidentDateTime: `${incidentDate} ${incidentTime}`,
        incidentLocation: incidentPlace,
        reportingPerson: `${reportingPerson} (${reporterRole})`,
        incidentDescription: fullDescription,
        suggestedAction: actionTakenSummary || 'تطبيق الإجراءات والقرارات النظامية وفق القرار الوزاري 851 وتوقيع النماذج الرسمية وتعديل السلوك.',
        counselorNotes: `تم اعتماد المعاملة الموحدة وتوقيع النماذج (${linkedFormNames.join('، ')}) إلكترونياً مع حسم إجمالي (${totalDeductionMarks}) درجات.`,
        status: studentSignature ? (parentSignature ? 'تم توقيع ولي الأمر' : 'تم توقيع الطالب') : 'تم الحفظ في ملف الطالب',
        recordedBy: counselor?.fullName || counselor?.displayName || 'المرشد المدرسي',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Multi-violation metadata
        isMultiViolationIncident: true,
        violationsList: incidentViolations.map((v) => ({
          code: v.catalogItem.code,
          degree: v.catalogItem.degree,
          title: v.catalogItem.title,
          repetition: v.repetition,
          deductionMarks: v.deductionMarks,
        })),
        totalDeductionMarks: totalDeductionMarks,
        linkedFormIds: [],
        linkedFormTypes: linkedFormNames,
        studentSignature: studentSignature || undefined,
        studentSignatureDate: studentSignatureDate,
        parentSignature: parentRefusedOrAbsent ? parentAbsentWitness : (parentSignature || undefined),
        parentSignatureDate: parentSignatureDate,
        principalSignature: principalSignature || undefined,
        principalSignatureDate: principalSignatureDate,
      };

      // 2. Prepare individual official forms based on selectedFormNumbers
      let createdWarningForm: WarningFormRecord | undefined = undefined;
      let createdNoticeForm: ParentNoticeFormRecord | undefined = undefined;
      let createdSummonForm: ParentSummonFormRecord | undefined = undefined;
      let createdCommitmentForm: ParentCommitmentFormRecord | undefined = undefined;
      let createdViolationReport: ViolationReportRecord | undefined = undefined;
      let createdDeductionNotice: BehaviorDeductionNoticeRecord | undefined = undefined;
      let createdConfiscation: DeviceConfiscationRecord | undefined = undefined;
      let createdAttendanceCommitment: AttendanceCommitmentRecord | undefined = undefined;

      // Model 6: Violation Report (تقرير مخالفة)
      if (selectedFormNumbers.includes(6)) {
        createdViolationReport = ({
          id: `VR-${schoolId}-${timestamp}`,
          schoolId,
          emirate: selectedStudent.schoolEmirate || 'الشارقة',
          operationsManagement: 'إدارة العمليات المدرسية',
          council: selectedStudent.council || 'المجلس التعليمي الثاني',
          sector: selectedStudent.sector || 'النطاق 3',
          schoolName: selectedStudent.schoolNameAr || schoolSettings.schoolName,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade,
          section: selectedStudent.section,
          reportedBy: reportingPerson,
          incidentDate: incidentDate,
          incidentTime: incidentTime,
          incidentPlace: incidentPlace as any,
          subject: combinedTitle,
          description: fullDescription,
          actionTaken: actionTakenSummary || 'توثيق الواقعة وتوقيع التعهدات وإشعار ولي الأمر وحسم الدرجات المقررة.',
          degree: (highestDegree.includes('الرابعة')
            ? 'الرابعة – شديدة الخطورة'
            : highestDegree.includes('الثالثة')
            ? 'الثالثة – خطيرة'
            : highestDegree.includes('الثانية')
            ? 'الثانية – متوسطة الخطورة'
            : 'الأولى – بسيطة') as any,
          violationCategory: incidentViolations[0]?.catalogItem.category || 'انضباط سلوكي',
          status: 'معتمد',
          studentSignature: studentSignature || undefined,
          studentSignatureDate: studentSignatureDate,
          guardianSignature: parentRefusedOrAbsent ? parentAbsentWitness : (parentSignature || undefined),
          guardianSignatureDate: parentSignatureDate,
          principalSignature: principalSignature || undefined,
          principalSignatureDate: principalSignatureDate,
          createdBy: counselor?.fullName || 'المرشد المدرسي',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }

      // Model 9: Student Warning & Commitment (تنبيه وتعهد الطالب)
      if (selectedFormNumbers.includes(9)) {
        createdWarningForm = {
          id: `WF-${schoolId}-${timestamp}`,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade,
          section: selectedStudent.section,
          emirate: selectedStudent.schoolEmirate || 'الشارقة',
          council: selectedStudent.council || 'المجلس التعليمي الثاني',
          sector: selectedStudent.sector || 'النطاق 3',
          school: selectedStudent.schoolNameAr || schoolSettings.schoolName,
          priorBehaviors: [
            incidentViolations[0]?.catalogItem.title || 'مخالفة قواعد السلوك المدرسي',
            incidentViolations[1]?.catalogItem.title || 'التأخر أو التقصير في التعليمات',
            incidentViolations[2]?.catalogItem.title || 'عدم الالتزام بالنظم واللوائح المعتمدة',
          ],
          studentPledge: 'أتعهد أنا الطالب بالالتزام التام بقواعد السلوك والنظام داخل المدرسة والمحافظة على مرافقها، وعدم تكرار المخالفات الصادرة عني.',
          formDate: incidentDate,
          counselorName: counselor?.fullName || 'المرشد الأكاديمي',
          counselorNotes: `تم رصد المخالفة بتاريخ ${incidentDate} وتطبيق أحكام القرار الوزاري 851.`,
          actionTaken: actionTakenSummary || 'تنبيه خطي للطالب وأخذ تعهده الخطي وإشعار ولي الأمر.',
          parentPhone: selectedStudent.guardianPhone || '',
          parentName: selectedStudent.guardianName || 'ولي أمر الطالب',
          parentRelation: selectedStudent.guardianRelationship || 'ولي الأمر',
          communicationDateTime: `${incidentDate} ${incidentTime}`,
          communicationResult: parentRefusedOrAbsent ? 'تم إثبات عدم الحضور' : 'تم التواصل وإحاطته بالواقعة والإجراءات',
          studentSignature: studentSignature || undefined,
          studentSignatureDate: studentSignatureDate,
          studentAttestation: true,
          parentSignature: parentRefusedOrAbsent ? parentAbsentWitness : (parentSignature || undefined),
          parentSignatureDate: parentSignatureDate,
          isParentSignatureRecorded: Boolean(parentSignature || parentRefusedOrAbsent),
          status: 'تم الاعتماد والتوقيع',
          recordedBy: counselor?.fullName || 'المرشد المدرسي',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Model 7: Parent Notice (تنبيه / إخطار ولي الأمر)
      if (selectedFormNumbers.includes(7)) {
        createdNoticeForm = {
          id: `PN-${schoolId}-${timestamp}`,
          formType: 'parent_notice_form',
          formNumber: 7,
          noticeType: highestDegree.includes('الرابعة')
            ? 'إنذار نهائي'
            : highestDegree.includes('الثالثة')
            ? 'إنذار ثاني'
            : highestDegree.includes('الثانية')
            ? 'إنذار أول'
            : 'تنبيه خطي',
          schoolId,
          emirate: selectedStudent.schoolEmirate || 'الشارقة',
          operationsManagement: 'إدارة العمليات المدرسية',
          council: selectedStudent.council || 'المجلس التعليمي الثاني',
          sector: selectedStudent.sector || 'النطاق 3',
          schoolName: selectedStudent.schoolNameAr || schoolSettings.schoolName,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade,
          section: selectedStudent.section,
          parentName: selectedStudent.guardianName || 'ولي أمر الطالب',
          parentPhone: selectedStudent.guardianPhone || '',
          incidentDay: new Intl.DateTimeFormat('ar-AE', { weekday: 'long' }).format(new Date(incidentDate)),
          incidentDate: incidentDate,
          violationDetails: fullDescription,
          deductedMarks: totalDeductionMarks,
          officerName: reportingPerson,
          officerRole: reporterRole,
          officerSignature: counselor?.fullName || 'المرشد الطلابي',
          principalName: principalName,
          principalSignature: principalSignature || undefined,
          principalSignatureDate: principalSignatureDate,
          studentSignature: studentSignature || undefined,
          studentSignatureDate: studentSignatureDate,
          parentSignature: parentRefusedOrAbsent ? parentAbsentWitness : (parentSignature || undefined),
          parentSignatureDate: parentSignatureDate,
          issueDate: incidentDate,
          status: 'معتمد ومسلّم',
          createdBy: counselor?.fullName || 'المرشد المدرسي',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Model 8: Parent Summon (خطاب استدعاء ولي الأمر)
      if (selectedFormNumbers.includes(8)) {
        createdSummonForm = {
          id: `PS-${schoolId}-${timestamp}`,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade,
          section: selectedStudent.section,
          parentName: selectedStudent.guardianName || 'ولي أمر الطالب',
          parentPhone: selectedStudent.guardianPhone || '',
          parentRelation: selectedStudent.guardianRelationship || 'ولي الأمر',
          emirate: selectedStudent.schoolEmirate || 'الشارقة',
          council: selectedStudent.council || 'المجلس التعليمي الثاني',
          sector: selectedStudent.sector || 'النطاق 3',
          school: selectedStudent.schoolNameAr || schoolSettings.schoolName,
          summonDay: new Intl.DateTimeFormat('ar-AE', { weekday: 'long' }).format(new Date(incidentDate)),
          summonDate: incidentDate,
          summonTime: '08:30 صباحاً',
          subject: combinedTitle,
          principalName: principalName,
          principalSignature: principalSignature || undefined,
          principalDate: incidentDate,
          studentSignature: studentSignature || undefined,
          studentSignatureDate: studentSignatureDate,
          status: 'تم الاستلام والتوقيع',
          schoolId,
          recordedBy: counselor?.fullName || 'المرشد المدرسي',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Model 10: Parent Commitment (تعهد ولي الأمر)
      if (selectedFormNumbers.includes(10)) {
        createdCommitmentForm = {
          id: `PC-${schoolId}-${timestamp}`,
          formType: 'parent_commitment_form',
          formNumber: 10,
          schoolId,
          emirate: selectedStudent.schoolEmirate || 'الشارقة',
          operationsManagement: 'إدارة العمليات المدرسية',
          council: selectedStudent.council || 'المجلس التعليمي الثاني',
          sector: selectedStudent.sector || 'النطاق 3',
          schoolName: selectedStudent.schoolNameAr || schoolSettings.schoolName,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade,
          section: selectedStudent.section,
          parentName: selectedStudent.guardianName || 'ولي أمر الطالب',
          parentPhone: selectedStudent.guardianPhone || '',
          parentRelation: selectedStudent.guardianRelationship || 'ولي الأمر',
          violationsList: incidentViolations.map((v) => `[${v.catalogItem.code}] ${v.catalogItem.title}`),
          formDate: incidentDate,
          parentSignature: parentRefusedOrAbsent ? parentAbsentWitness : (parentSignature || undefined),
          parentSignatureDate: parentSignatureDate,
          vicePrincipalName: principalName,
          vicePrincipalSignature: principalSignature || undefined,
          vicePrincipalSignatureDate: principalSignatureDate,
          issueDate: incidentDate,
          status: 'معتمد ومسلّم',
          createdBy: counselor?.fullName || 'المرشد المدرسي',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Model 20: Behavior Deduction Notice (إخطار بالحسم من درجة السلوك)
      if (selectedFormNumbers.includes(20)) {
        createdDeductionNotice = {
          id: `BDN-${schoolId}-${timestamp}`,
          formType: 'behavior_deduction_notice',
          formNumber: 20,
          schoolId,
          studentId: selectedStudent.id,
          studentNumber: selectedStudent.studentNumber || selectedStudent.nationalId || '',
          studentName: selectedStudent.fullName,
          grade: selectedStudent.grade,
          section: selectedStudent.section,
          parentName: selectedStudent.guardianName || 'ولي أمر الطالب',
          parentPhone: selectedStudent.guardianPhone || '',
          violationDegree: highestDegree,
          violationDescription: combinedTitle,
          committeeDecisionNumber: `DEC-${new Date().getFullYear()}-${timestamp.toString().slice(-4)}`,
          committeeDecisionDate: incidentDate,
          deductedMarks: totalDeductionMarks,
          term: 'الفصل الدراسي الأول',
          academicYear: '2026/2027',
          recoveryProposals: [
            'الالتزام بالحضور الصباحي التام وعدم ارتكاب أي تأخيرات خلال 3 أسابيع متتالية.',
            'المشاركة في الأنشطة والفعاليات المدرسية أو تقديم مبادرة تطوعية في خدمة البيئة المدرسية.',
            'تحقيق معايير السلوك المتميز والحصول على تقييم إيجابي من معلمي المواد ومربّي الصف.',
          ],
          principalName: principalName,
          principalSignature: principalSignature || undefined,
          parentSignature: parentRefusedOrAbsent ? parentAbsentWitness : (parentSignature || undefined),
          parentSignatureDate: parentSignatureDate,
          status: 'معتمد ومسلّم',
          createdBy: counselor?.fullName || 'المرشد المدرسي',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Save via parent handler
      await onSaveUnifiedIncident({
        incidentRecord: unifiedViolationRecord,
        createdWarningForm,
        createdNoticeForm,
        createdSummonForm,
        createdCommitmentForm,
        createdViolationReport,
        createdDeductionNotice,
        createdConfiscation,
        createdAttendanceCommitment,
      });

      onShowToast(
        `تم حفظ الواقعة بنجاح كـ "مخالفة واحدة" في ملف الطالب وتوليد (${selectedFormNumbers.length}) نماذج رسمية موقعة إلكترونياً!`,
        'success'
      );

      // Offer batch print preview or close
      setShowBatchPrintPreview(true);
    } catch (err: any) {
      console.error('Error saving unified incident:', err);
      onShowToast(err.message || 'حدث خطأ أثناء حفظ المعاملة الموحدة', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0c1626] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0C2340] via-[#006D77] to-[#0C2340] text-white flex items-center justify-between border-b border-[#D4AF37]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-[#D4AF37] shadow-inner">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37] text-slate-950">
                  القرار الوزاري رقم 851 لسنة 2018
                </span>
                <span className="text-[10px] text-teal-200">منظومة الدمج والتوقيعات الموحدة</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                تسجيل واقعة مخالفة مجمعة وتجهيز النماذج والتوقيعات الإلكترونية
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="bg-slate-50 dark:bg-slate-900/80 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto text-xs shrink-0">
          {[
            { num: 1, label: '1. الطالب والواقعة' },
            { num: 2, label: `2. رصد المخالفات (${incidentViolations.length})` },
            { num: 3, label: `3. النماذج المعتمدة (${selectedFormNumbers.length})` },
            { num: 4, label: '4. التوقيع الإلكتروني المشترك' },
            { num: 5, label: '5. المعاينة والحفظ بملف الطالب' },
          ].map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setCurrentStep(st.num)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentStep === st.num
                  ? 'bg-[#006D77] text-white shadow-xs'
                  : currentStep > st.num
                  ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <span>{st.label}</span>
              {currentStep > st.num && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STEP 1: STUDENT & INCIDENT META */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-teal-950 dark:text-teal-100">
                    الخطوة 1: اختيار الطالب وتفاصيل مكان وتاريخ الواقعة
                  </h4>
                  <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                    اختر الطالب المعني وحدد مكان وزمان حدوث المخالفة والشخص محرر البلاغ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGradeSelectorOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#006D77] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#00555d] transition-colors shadow-xs"
                >
                  <Layers className="w-4 h-4 text-[#D4AF37]" />
                  <span>تحديد بالصفوف والشعب</span>
                </button>
              </div>

              {/* Student Picker Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#006D77]" />
                    <span>الطالب المخالف:</span>
                  </label>
                  <div className="w-64 relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث سريع باسم الطالب أو الرقم..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {filteredStudents.map((s) => {
                    const isSelected = s.id === selectedStudentId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#006D77] bg-teal-50/80 dark:bg-teal-950/40 ring-2 ring-[#006D77]/40 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 bg-white dark:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {s.fullName}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          <span>الصف {s.grade} - {s.section}</span>
                          <span>•</span>
                          <span>رقم: {s.studentNumber || s.nationalId || '---'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Student Summary Card */}
                {selectedStudent && (
                  <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-bold">
                        {selectedStudent.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-black text-slate-900 dark:text-white">
                            {selectedStudent.fullName}
                          </h5>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                            الصف {selectedStudent.grade} - شعبة {selectedStudent.section} ({selectedStudent.track || 'عام'})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          ولي الأمر: {selectedStudent.guardianName || 'غير مسجل'} • هاتف: {selectedStudent.guardianPhone || 'لا يوجد'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">رصيد السلوك الحالي:</span>
                      <span className="font-black text-teal-700 dark:text-teal-300 text-sm">
                        {selectedStudent.behaviorScore !== undefined ? selectedStudent.behaviorScore : 100} / 100
                      </span>
                      {onOpenStudentProfile && (
                        <button
                          type="button"
                          onClick={() => onOpenStudentProfile(selectedStudent.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                        >
                          عرض الملف
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Incident Meta Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>تاريخ الواقعة</span>
                  </label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>توقيت الحدوث</span>
                  </label>
                  <input
                    type="text"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    placeholder="08:30 ص"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>مكان الحدوث</span>
                  </label>
                  <select
                    value={incidentPlace}
                    onChange={(e) => setIncidentPlace(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="الصف الدراسي">الصف الدراسي</option>
                    <option value="ممر المدرسة">ممر المدرسة</option>
                    <option value="ساحة الطابور / الفسحة">ساحة الطابور / الفسحة</option>
                    <option value="الحافلة المدرسية">الحافلة المدرسية</option>
                    <option value="المختبر العلمي">المختبر العلمي</option>
                    <option value="الملعب الرياضي">الملعب الرياضي</option>
                    <option value="دورات المياه">دورات المياه</option>
                    <option value="خارج المدرسة أثناء نشاط رسمي">خارج المدرسة أثناء نشاط رسمي</option>
                    <option value="مكان آخر">مكان آخر</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>محرر البلاغ / رائد الصف</span>
                  </label>
                  <input
                    type="text"
                    value={reportingPerson}
                    onChange={(e) => setReportingPerson(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              </div>

              {/* General Incident Notes / Description with AI Rephrase */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    وصف التصرف / الحادثة / الموقف المشترك (وفق النموذج 6):
                  </label>
                  <button
                    type="button"
                    onClick={handleTriggerAiRephrase}
                    disabled={isAiLoading}
                    className="px-2.5 py-1 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] dark:text-teal-300 border border-[#006D77]/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
                    title="تحسين صياغة الواقعة بالذكاء الاصطناعي / Improve Incident Wording with AI"
                    aria-label="Improve Incident Wording with AI"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#006D77] animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    )}
                    <span>
                      {isAiLoading
                        ? 'جارٍ تحسين الصياغة بالذكاء الاصطناعي...'
                        : 'تحسين صياغة الواقعة بالذكاء الاصطناعي (Improve Incident Wording with AI)'}
                    </span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="اكتب صياغة تربوية دقيقة وموضوعية لما حدث (أو اكتبها بعفوية ثم انقر على تحسين الصياغة بالذكاء الاصطناعي)..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 2: MULTI-VIOLATION SELECTOR */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>الخطوة 2: إضافة المخالفات السلوكية في الواقعة الواحدة</span>
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    يمكنك إضافة أكثر من مخالفة لنفس الطالب في نفس النموذج والمعاملة مع احتساب إجمالي الحسم تلقائياً.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">عدد المخالفات</span>
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                      {incidentViolations.length}
                    </span>
                  </div>
                  <div className="text-center px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 shadow-2xs">
                    <span className="text-[10px] text-rose-600 block">إجمالي درجات الحسم</span>
                    <span className="text-sm font-black text-rose-700 dark:text-rose-300">
                      -{totalDeductionMarks} درجات
                    </span>
                  </div>
                </div>
              </div>

              {/* Already Added Violations List */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>المخالفات المضافة في هذا النموذج ({incidentViolations.length}):</span>
                </h5>

                {incidentViolations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    لم تقم بإضافة أي مخالفة بعد. اختر مخالفة أو أكثر من جدول اللائحة أدناه.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incidentViolations.map((v, idx) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-[#0C2340] text-[#D4AF37]">
                              {v.catalogItem.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {v.catalogItem.degree}
                            </span>
                          </div>
                          <h6 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {idx + 1}. {v.catalogItem.title}
                          </h6>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                          {/* Repetition Selector */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[11px] text-slate-500">التكرار:</span>
                            <select
                              value={v.repetition}
                              onChange={(e) => handleUpdateRepetition(v.id, e.target.value as any)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                            >
                              <option value="حال ارتكابها">حال ارتكابها لأول مرة</option>
                              <option value="تكرار للمرة الأولى">تكرار للمرة الأولى</option>
                              <option value="تكرار للمرة الثانية">تكرار للمرة الثانية</option>
                              <option value="تكرار للمرة الثالثة">تكرار للمرة الثالثة</option>
                              <option value="أكثر من 3 مرات">أكثر من 3 مرات</option>
                            </select>
                          </div>

                          {/* Deduction preview */}
                          <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-black">
                            -{v.deductionMarks} درجات
                          </span>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveViolation(v.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف هذه المخالفة من الواقعة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Catalog Search & Add Violations Section */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h5 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#006D77]" />
                    <span>إضافة مخالفة من جدول القرار الوزاري 851:</span>
                  </h5>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDegreeFilter}
                      onChange={(e) => setSelectedDegreeFilter(e.target.value)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="all">جميع الدرجات</option>
                      <option value="الدرجة الأولى (بسيطة)">الدرجة الأولى (بسيطة)</option>
                      <option value="الدرجة الثانية (متوسطة)">الدرجة الثانية (متوسطة)</option>
                      <option value="الدرجة الثالثة (جسيمة)">الدرجة الثالثة (جسيمة)</option>
                      <option value="الدرجة الرابعة (شديدة الخطورة)">الدرجة الرابعة (شديدة الخطورة)</option>
                    </select>

                    <div className="w-48 relative">
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ابحث بالرمز أو الاسم..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="w-full pr-7 pl-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {filteredCatalog.map((item) => {
                    const isAlreadyAdded = incidentViolations.some((v) => v.catalogItem.code === item.code);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 ${
                          isAlreadyAdded
                            ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#006D77]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#006D77] px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-900/40">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">{item.category}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate mt-0.5">
                            {item.title}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isAlreadyAdded}
                          onClick={() => handleAddViolationToIncident(item)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 transition-all ${
                            isAlreadyAdded
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-[#006D77] hover:bg-[#00555d] text-white shadow-xs cursor-pointer'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isAlreadyAdded ? 'مضافة' : 'إضافة'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FORMS CHECKLIST */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-indigo-600" />
                    <span>الخطوة 3: تحديد النماذج الرسمية التابعة للواقعة (PDF القرار 851)</span>
                  </h4>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                    اختر النماذج المطلوب تحريرها وتوقيعها. تم اقتراح النماذج المناسبة تلقائياً بناءً على المخالفات المرصودة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => autoSuggestForms(incidentViolations)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>إعادة الاقتراح التلقائي</span>
                </button>
              </div>

              {/* Official Forms Grid with Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {OFFICIAL_BYLAW_FORMS.map((formDef) => {
                  const isChecked = selectedFormNumbers.includes(formDef.number);
                  return (
                    <div
                      key={formDef.number}
                      onClick={() => toggleFormSelection(formDef.number)}
                      className={`p-4 rounded-2xl border text-right cursor-pointer transition-all flex flex-col justify-between space-y-2.5 ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-[#0C2340] text-[#D4AF37]">
                            {formDef.shortName}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                          />
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {formDef.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {formDef.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                        <span>الصفحة بالـ PDF: {formDef.pdfPage}</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formDef.targetRole}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: UNIFIED E-SIGNATURE HUB */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0C2340] text-white border border-[#D4AF37]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black flex items-center gap-2 text-white">
                    <FileSignature className="w-4 h-4 text-[#D4AF37]" />
                    <span>الخطوة 4: منصة التوقيع الإلكتروني الموحدة لكافة النماذج المحددة</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    التوقيع هنا يُطبّق دفعة واحدة على جميع النماذج المختارة ({selectedFormNumbers.map((n) => `نموذج ${n}`).join('، ')}) وتُحفظ كمعاملة ومخالفة موحدة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={applyQuickDemoSignatures}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#D4AF37] border border-[#D4AF37]/50 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توليد توقيع إلكتروني سريع</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Student Signature Pad */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>توقيع الطالب الإلكتروني بالعلم والتعهد</span>
                      </h5>
                      <p className="text-[11px] text-slate-500">الطالب: {selectedStudent?.fullName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearStudentCanvas}
                      className="px-2 py-1 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>مسح</span>
                    </button>
                  </div>

                  {/* Canvas area */}
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                    <canvas
                      ref={studentCanvasRef}
                      width={380}
                      height={140}
                      onMouseDown={handleStudentCanvasDown}
                      onMouseMove={handleStudentCanvasMove}
                      onMouseUp={handleStudentCanvasUp}
                      onTouchStart={handleStudentCanvasDown}
                      onTouchMove={handleStudentCanvasMove}
                      onTouchEnd={handleStudentCanvasUp}
                      className="w-full h-32 cursor-crosshair touch-none"
                    />
                    {!studentSignature && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                        وقّع هنا باستخدام القلم أو اللمس أو الماوس...
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                    «أتعهد أنا الطالب بالالتزام بلائحة السلوك والأنظمة المدرسية وأقر بالعلم بالمخالفة والإجراء المترتب عليها».
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">تاريخ توقيع الطالب:</span>
                    <input
                      type="date"
                      value={studentSignatureDate}
                      onChange={(e) => setStudentSignatureDate(e.target.value)}
                      className="p-1 rounded-lg border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* 2. Parent Signature Pad */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                        <span>توقيع ولي الأمر الإلكتروني بالعلم والتعهد</span>
                      </h5>
                      <p className="text-[11px] text-slate-500">ولي الأمر: {selectedStudent?.guardianName || 'ولي أمر الطالب'}</p>
                    </div>
                    {!parentRefusedOrAbsent && (
                      <button
                        type="button"
                        onClick={clearParentCanvas}
                        className="px-2 py-1 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>مسح</span>
                      </button>
                    )}
                  </div>

                  {!parentRefusedOrAbsent ? (
                    <>
                      <div className="border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                        <canvas
                          ref={parentCanvasRef}
                          width={380}
                          height={140}
                          onMouseDown={handleParentCanvasDown}
                          onMouseMove={handleParentCanvasMove}
                          onMouseUp={handleParentCanvasUp}
                          onTouchStart={handleParentCanvasDown}
                          onTouchMove={handleParentCanvasMove}
                          onTouchEnd={handleParentCanvasUp}
                          className="w-full h-32 cursor-crosshair touch-none"
                        />
                        {!parentSignature && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                            توقيع ولي الأمر الإلكتروني هنا...
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                        «أقر أنا ولي أمر الطالب باطلاعي وتعهدي بمتابعة سلوك ابني والتعاون مع المدرسة للحد من تكرار المخالفات».
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>إثبات عدم الحضور / امتناع التوقيع (المادة 17 بند 3)</span>
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                        في حال رفض ولي الأمر التوقيع أو امتناعه عن الحضور، يُثبت ذلك في ذات المحضر وبحضور المرشد الأكاديمي وضابط السلامة ويعد دليلاً على علمه بواقعة المخالفة.
                      </p>
                      <input
                        type="text"
                        value={parentAbsentWitness}
                        onChange={(e) => setParentAbsentWitness(e.target.value)}
                        className="w-full p-2 rounded-lg border border-rose-300 bg-white dark:bg-slate-900 text-xs font-bold text-rose-950 dark:text-rose-100"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={parentRefusedOrAbsent}
                        onChange={(e) => setParentRefusedOrAbsent(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-rose-600"
                      />
                      <span className="text-[11px]">تعذر الحضور / امتناع عن التوقيع (مادة 17/3)</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">التاريخ:</span>
                      <input
                        type="date"
                        value={parentSignatureDate}
                        onChange={(e) => setParentSignatureDate(e.target.value)}
                        className="p-1 rounded-lg border border-slate-200 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Administration & Counselor Endorsement */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#0C2340] text-[#D4AF37] flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 dark:text-white">
                      اعتماد إدارة المدرسة والمرشد الأكاديمي
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      محرر المعاملة: {reportingPerson} • مدير المدرسة: {principalName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">مدير المدرسة:</span>
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold w-36"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">التاريخ:</span>
                    <input
                      type="date"
                      value={principalSignatureDate}
                      onChange={(e) => setPrincipalSignatureDate(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SAVE */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>الخطوة 5: مراجعة المعاملة والحفظ بملف الطالب كمخالفة موحدة</span>
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    سيتم حفظ هذه الواقعة الشاملة بكل مخالفاتها ونماذجها وتواقيعها الرقمية تحت مسمى مخالفة واحدة بملف الطالب.
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs">
                  جاهز للاعتماد النهائي
                </span>
              </div>

              {/* Master Summary Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#006D77] font-bold block">
                      ملف الطالب المستهدف
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {selectedStudent?.fullName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      الصف {selectedStudent?.grade} - {selectedStudent?.section} • رقم: {selectedStudent?.studentNumber || selectedStudent?.nationalId}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">إجمالي الحسم:</span>
                      <span className="text-base font-black text-rose-600">-{totalDeductionMarks} درجات</span>
                    </div>
                    <div className="text-right border-r border-slate-200 dark:border-slate-700 pr-3">
                      <span className="text-[10px] text-slate-400 block">تاريخ الواقعة:</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-white">{incidentDate}</span>
                    </div>
                  </div>
                </div>

                {/* Violations in this incident */}
                <div className="space-y-2">
                  <h6 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    بنود المخالفات المرصودة في هذا النموذج ({incidentViolations.length}):
                  </h6>
                  <div className="space-y-1.5">
                    {incidentViolations.map((v, i) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                            {v.catalogItem.code}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {i + 1}. {v.catalogItem.title}
                          </span>
                        </div>
                        <span className="font-black text-rose-600 text-xs">
                          {v.repetition} (-{v.deductionMarks} درجات)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forms to generate */}
                <div className="space-y-2 pt-2">
                  <h6 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    النماذج الرسمية التي سيتم إنشاؤها وأرشفتها بملف الطالب ({selectedFormNumbers.length}):
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    {selectedFormNumbers.map((num) => {
                      const f = OFFICIAL_BYLAW_FORMS.find((o) => o.number === num);
                      return (
                        <span
                          key={num}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{f ? `${f.shortName} (${f.title})` : `نموذج ${num}`}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures status */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">توقيع الطالب:</span>
                    {studentSignature ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3" /> موقع إلكترونياً
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold text-[10px]">بانتظار التوقيع</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">توقيع ولي الأمر:</span>
                    {parentRefusedOrAbsent ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                        مثبت بالمادة 17/3
                      </span>
                    ) : parentSignature ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3" /> موقع إلكترونياً
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold text-[10px]">بانتظار التوقيع</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">اعتماد الإدارة:</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                      معتمد ({principalName})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الخطوة السابقة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !selectedStudent) {
                    onShowToast('يرجى اختيار الطالب للمتابعة', 'warning');
                    return;
                  }
                  if (currentStep === 2 && incidentViolations.length === 0) {
                    onShowToast('يرجى إضافة مخالفة واحدة على الأقل', 'warning');
                    return;
                  }
                  setCurrentStep((prev) => prev + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#00555d] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>المتابعة إلى {currentStep === 1 ? 'رصد المخالفات' : currentStep === 2 ? 'اختيار النماذج' : currentStep === 3 ? 'التوقيع الإلكتروني' : 'المراجعة والحفظ'}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAndCommit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'جارٍ الحفظ والتوثيق...' : 'اعتماد وحفظ المعاملة بملف الطالب'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grade / Section Student Selector Modal */}
      {isGradeSelectorOpen && (
        <GradeSectionStudentSelectorModal
          isOpen={isGradeSelectorOpen}
          onClose={() => setIsGradeSelectorOpen(false)}
          students={students}
          onSelectStudent={(student) => {
            setSelectedStudentId(student.id);
            setIsGradeSelectorOpen(false);
            onShowToast(`تم اختيار الطالب: ${student.fullName}`, 'success');
          }}
        />
      )}

      {/* Batch Print Preview Modal on completion */}
      {showBatchPrintPreview && selectedStudent && (
        <PrintPreviewModalWrapper
          isOpen={showBatchPrintPreview}
          onClose={() => {
            setShowBatchPrintPreview(false);
            onClose();
          }}
          title="معاينة طباعة النماذج الرسمية الموقعة إلكترونياً (القرار الوزاري 851)"
          subtitle={`المعاملة الموحدة للطالب: ${selectedStudent.fullName} • الصف ${selectedStudent.grade} (${selectedStudent.section})`}
          printButtonId="btn-batch-print"
          printButtonText="طباعة النماذج المعتمدة / تصدير PDF"
          defaultZoom={85}
        >
          <div className="space-y-8 p-6 bg-white text-slate-900 font-sans" dir="rtl">
            {/* Header of official document */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <p className="text-xs font-bold text-slate-600">دولة الإمارات العربية المتحدة • وزارة التربية والتعليم</p>
              <h2 className="text-base font-black text-slate-900">
                لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام (القرار الوزاري رقم 851 لسنة 2018م)
              </h2>
              <p className="text-xs font-bold text-[#006D77]">
                سجل الواقعة السلوكية المجمعة والنماذج الرسمية الموقعة إلكترونياً
              </p>
            </div>

            {/* Student & Incident Bio Table */}
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="bg-slate-100">
                  <td className="p-2 border border-slate-300 font-bold w-1/4">اسم الطالب / الطالبة:</td>
                  <td className="p-2 border border-slate-300 font-black">{selectedStudent.fullName}</td>
                  <td className="p-2 border border-slate-300 font-bold w-1/4">الصف والشعبة:</td>
                  <td className="p-2 border border-slate-300">الصف {selectedStudent.grade} - شعبة {selectedStudent.section}</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-300 font-bold">تاريخ وتوقيت الواقعة:</td>
                  <td className="p-2 border border-slate-300">{incidentDate} - {incidentTime}</td>
                  <td className="p-2 border border-slate-300 font-bold">مكان الحدوث:</td>
                  <td className="p-2 border border-slate-300">{incidentPlace}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-2 border border-slate-300 font-bold">محرر المخالفة:</td>
                  <td className="p-2 border border-slate-300">{reportingPerson} ({reporterRole})</td>
                  <td className="p-2 border border-slate-300 font-bold">إجمالي درجات الحسم:</td>
                  <td className="p-2 border border-slate-300 font-black text-rose-600">-{totalDeductionMarks} درجات سلوك</td>
                </tr>
              </tbody>
            </table>

            {/* List of Violations */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 border-r-4 border-[#006D77] pr-2">
                بنود المخالفات السلوكية المرصودة في هذه المعاملة:
              </h4>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-black text-slate-800">
                    <th className="p-2 border border-slate-300 text-center w-12">#</th>
                    <th className="p-2 border border-slate-300 text-center w-20">رمز البند</th>
                    <th className="p-2 border border-slate-300 text-right">وصف المخالفة وفق القرار 851</th>
                    <th className="p-2 border border-slate-300 text-center w-36">الدرجة والتكرار</th>
                    <th className="p-2 border border-slate-300 text-center w-24">الحسم</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentViolations.map((v, idx) => (
                    <tr key={v.id}>
                      <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">{v.catalogItem.code}</td>
                      <td className="p-2 border border-slate-300 font-bold">{v.catalogItem.title}</td>
                      <td className="p-2 border border-slate-300 text-center">{v.repetition}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-rose-600">-{v.deductionMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Description & Action */}
            <div className="p-3 border border-slate-300 rounded-lg text-xs space-y-2 bg-slate-50">
              <p className="font-bold text-slate-900">ملخص الوقائع والإجراء المتخذ:</p>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {incidentDescription || 'تم رصد وتوثيق المخالفات السلوكية المذكورة وتطبيق أحكام وإجراءات القرار الوزاري رقم 851 لعام 2018.'}
              </p>
            </div>

            {/* Signatures Row */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-2">
                <p className="font-bold text-slate-800">توقيع الطالب / الطالبة بالعلم:</p>
                <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-1 bg-white">
                  {studentSignature ? (
                    <img src={studentSignature} alt="توقيع الطالب" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400">توقيع إلكتروني معتمد</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">التاريخ: {studentSignatureDate}</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800">توقيع ولي أمر الطالب:</p>
                <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-1 bg-white">
                  {parentRefusedOrAbsent ? (
                    <span className="text-[10px] text-rose-700 font-bold leading-tight">
                      تم الإثبات وفق المادة 17/3 لتعذر الحضور
                    </span>
                  ) : parentSignature ? (
                    <img src={parentSignature} alt="توقيع ولي الأمر" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400">توقيع إلكتروني معتمد</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">التاريخ: {parentSignatureDate}</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800">اعتماد إدارة المدرسة / المدير:</p>
                <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-1 bg-white">
                  {principalSignature ? (
                    <img src={principalSignature} alt="توقيع المدير" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-xs font-black text-slate-900">{principalName}</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">التاريخ: {principalSignatureDate}</p>
              </div>
            </div>
          </div>
        </PrintPreviewModalWrapper>
      )}

      {/* AI Rephrase Review, Edit & Approval Modal (Drafting Assistant) */}
      {isAiModalOpen && aiResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0e1726] rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden text-right flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#0C2340] text-white p-4 px-6 flex items-center justify-between border-b-2 border-[#D4AF37] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#006D77] flex items-center justify-center text-[#D4AF37] shadow-inner">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base">
                      مراجعة تحسين الصياغة بالذكاء الاصطناعي
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-slate-950 font-bold">
                      مساعد مسودة
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    صياغة تربوية موضوعية محايدة للسجلات الرسمية • القرار النهائي للمرشد المدرسي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRejectAiRephrase}
                className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="إغلاق ورفض الصياغة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {/* Original text box */}
              <div className="bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    النص الأصلي المدخل:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {originalDraftText.length} حرف
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  {originalDraftText}
                </p>
              </div>

              {/* Editable Rephrased Text Box */}
              <div className="bg-teal-50/70 dark:bg-teal-950/30 p-4 rounded-xl border-2 border-[#006D77]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#006D77] dark:text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>الصياغة الرسمية المقترحة (قابلة للتعديل المباشر):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                      {aiResult.tone || 'أسلوب موضوعي محايد'}
                    </span>
                    {aiEditedText !== aiResult.improvedText && (
                      <button
                        type="button"
                        onClick={() => setAiEditedText(aiResult.improvedText)}
                        className="text-[10px] font-bold text-slate-500 hover:text-[#006D77] underline cursor-pointer"
                        title="استعادة النص المقترح من الذكاء الاصطناعي قبل التعديل اليدوي"
                      >
                        استعادة مقترح AI
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={aiEditedText}
                    onChange={(e) => setAiEditedText(e.target.value)}
                    placeholder="يمكنك إجراء أي تعديل أو إضافة على الصياغة هنا قبل الاعتماد..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-[#006D77]/30 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed font-medium focus:ring-2 focus:ring-[#006D77] focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
                    <span className="flex items-center gap-1 text-[#006D77] dark:text-teal-300 font-medium">
                      <Edit3 className="w-3 h-3" />
                      يمكنك تعديل أي جزء من النص مباشرة
                    </span>
                    <span className="font-mono">{aiEditedText.length} حرف</span>
                  </div>
                </div>
              </div>

              {/* Key Improvements Made */}
              {aiResult.keyChanges.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    أبرز التحسينات التربوية والقانونية المطبقة على الصياغة:
                  </span>
                  <ul className="space-y-1.5">
                    {aiResult.keyChanges.map((change, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Legal and Counselor Decision Notice */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>تنبيه إداري وتربوي:</strong> هذه الميزة مخصصة للمساعدة في صياغة المسودة بأسلوب إداري موضوعي خالٍ من الانفعال أو التهويل؛ ولا تنفذ أي إجراء أو قرار تلقائي، والقرار النهائي للاعتماد يعود للمرشد المدرسي والمستخدم المخول.
                </p>
              </div>
            </div>

            {/* Modal Actions: Accept, Reject, Edit */}
            <div className="p-4 px-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] text-slate-500">
                اختر قبول الصياغة لاعتمادها في وصف الواقعة أو رفضها للاحتفاظ بالنص الأصلي
              </span>

              <div className="flex items-center gap-2">
                {/* Reject Option */}
                <button
                  type="button"
                  onClick={handleRejectAiRephrase}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="رفض الصياغة المقترحة والاحتفاظ بالأصل"
                >
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>رفض والاحتفاظ بالأصل (Reject)</span>
                </button>

                {/* Accept Option */}
                <button
                  type="button"
                  onClick={handleApplyAiRephrase}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  title="اعتماد الصياغة وتطبيقها في حقل وصف الواقعة"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>موافقة واعتماد الصياغة (Accept)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
