import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  Calendar,
  MapPin,
  User,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
  List,
  LayoutGrid,
  Layers,
  Trash2,
  Tag,
  BookOpen,
  Loader2,
  Edit3,
  Link2,
  Users,
  FileSignature,
  MessageSquare,
} from 'lucide-react';
import {
  Student,
  ViolationRecord,
  ViolationReportRecord,
  ViolationDegree,
  ViolationStatus,
  CounselorUser,
} from '../types';
import { BYLAW_VIOLATIONS_CATALOG, BylawViolationItem } from '../data/bylawData';
import { getUaeFullDateTimeString, getUaeTodayDateString } from '../utils/time';
import { rephraseIncidentObjective, rephraseIncidentWithAI, RephraseResult } from '../utils/aiRephrase';
import { ViolationModelLinkerModal } from '../components/ViolationModelLinkerModal';
import { getCommitteeCasesByViolationId, getEmployees } from '../storage';
import { EmployeeRecord } from '../types';
import { OfficialDocumentsManager } from '../components/OfficialDocumentsManager';

interface ViolationsPageProps {
  students: Student[];
  violations: ViolationRecord[];
  violationReports?: ViolationReportRecord[];
  counselor: CounselorUser | null;
  onAddViolation: (
    v: Omit<ViolationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onUpdateViolation: (v: ViolationRecord) => void;
  onDeleteViolation?: (violationId: string, studentNumber?: string, studentId?: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenViolationReportForStudent?: (studentId: string, violationId?: string) => void;
  onSendViolationsToMessages?: (violationIds: string[], studentIds: string[]) => void;
  preselectedStudentId?: string | null;
  onClearPreselectedStudent?: () => void;
}

export const ViolationsPage: React.FC<ViolationsPageProps> = ({
  students,
  violations,
  violationReports = [],
  counselor,
  onAddViolation,
  onUpdateViolation,
  onDeleteViolation,
  onShowToast,
  onOpenStudentProfile,
  onOpenViolationReportForStudent,
  onSendViolationsToMessages,
  preselectedStudentId,
  onClearPreselectedStudent,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const isViewer = counselor?.role === 'viewer';

  // Page Subtab: 'violations' (سجل المخالفات) | 'official-forms' (النماذج والتوقيعات الرسمية)
  const [activePageTab, setActivePageTab] = useState<'violations' | 'official-forms'>('violations');

  // Form Fields
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Auto-select student and open add form when requested from student profile or students list
  useEffect(() => {
    if (preselectedStudentId) {
      const found = students.find(
        (s) => s.id === preselectedStudentId || s.studentNumber === preselectedStudentId
      );
      if (found) {
        setSelectedStudent(found);
        setStudentSearch(found.fullName);
        setShowAddForm(true);
      }
    }
  }, [preselectedStudentId, students]);

  // Multi-violations incident workflow state
  const [selectedViolations, setSelectedViolations] = useState<
    NonNullable<ViolationRecord['violationsList']>
  >([]);

  // Violation Picker State (for adding violations to the incident)
  const [pickerDegreeFilter, setPickerDegreeFilter] = useState<string>('all');
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string>('');
  const [selectedRepetition, setSelectedRepetition] = useState<string>('حال ارتكابها');
  const [deductionMarksInput, setDeductionMarksInput] = useState<number>(0);
  const [customViolationTitle, setCustomViolationTitle] = useState<string>('');
  const [customViolationCode, setCustomViolationCode] = useState<string>('بند خاص');
  const [customViolationDegree, setCustomViolationDegree] = useState<ViolationDegree>('الدرجة الأولى (بسيطة)');

  // Incident Details State
  const [incidentDateTime, setIncidentDateTime] = useState(getUaeFullDateTimeString());
  const [incidentLocation, setIncidentLocation] = useState('الصف الدراسي');
  const [customLocation, setCustomLocation] = useState('');
  const [reportingPerson, setReportingPerson] = useState('أ. المعلم المناوب');
  const [staffEmployees, setStaffEmployees] = useState<EmployeeRecord[]>(() => getEmployees());
  const [incidentDescription, setIncidentDescription] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [counselorNotes, setCounselorNotes] = useState('');
  const [status, setStatus] = useState<ViolationStatus>('تم التنبيه');

  // Sync staff employees on mount
  useEffect(() => {
    setStaffEmployees(getEmployees());
  }, []);

  // AI Rephrasing State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<RephraseResult | null>(null);
  const [aiEditedText, setAiEditedText] = useState('');
  const [originalDraftText, setOriginalDraftText] = useState('');

  // Table Filters State
  const [tableSearch, setTableSearch] = useState('');
  const [filterViolationType, setFilterViolationType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDegree, setFilterDegree] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterReliability, setFilterReliability] = useState<'all' | 'verified' | 'unlinked'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [violationToLink, setViolationToLink] = useState<ViolationRecord | null>(null);
  const [linkStudentSearch, setLinkStudentSearch] = useState('');
  const [selectedViolationIdsForMsg, setSelectedViolationIdsForMsg] = useState<string[]>([]);

  const toggleSelectViolationForMsg = (violationId: string) => {
    setSelectedViolationIdsForMsg((prev) =>
      prev.includes(violationId) ? prev.filter((id) => id !== violationId) : [...prev, violationId]
    );
  };

  const handleSendSelectedToMessages = (violationIdsToSend: string[]) => {
    if (!onSendViolationsToMessages || violationIdsToSend.length === 0) return;
    const matchedViolations = violations.filter((v) => violationIdsToSend.includes(v.id));
    const studentIdsSet = new Set<string>();
    matchedViolations.forEach((v) => {
      const matchedStudent = students.find(
        (s) => s.id === v.studentId || s.studentNumber === v.studentNumber
      );
      if (matchedStudent) {
        studentIdsSet.add(matchedStudent.id);
      } else if (v.studentId) {
        studentIdsSet.add(v.studentId);
      }
    });
    const studentIds = Array.from(studentIdsSet);
    if (studentIds.length === 0) {
      onShowToast('يرجى ربط المخالفات المحددة بطلاب معتمدين في السجل أولاً قبل مراسلة أولياء الأمور', 'warning');
      return;
    }
    onSendViolationsToMessages(violationIdsToSend, studentIds);
  };

  // Determine whether a violation record has a reliable unique student link
  const isRecordReliablyLinked = (v: ViolationRecord) => {
    if (!v.studentNumber || !v.studentNumber.trim() || v.studentNumber === 'غير محدد') return false;
    return students.some(
      (s) => s.studentNumber === v.studentNumber || (v.studentId && s.id === v.studentId)
    );
  };

  // Count unlinked legacy records for manual review
  const unlinkedLegacyViolationsCount = useMemo(() => {
    return violations.filter((v) => !isRecordReliablyLinked(v)).length;
  }, [violations, students]);

  // Matching students for manual linking modal
  const matchingStudentsForLinking = useMemo(() => {
    if (!linkStudentSearch.trim()) return students.slice(0, 6);
    const q = linkStudentSearch.trim().toLowerCase();
    return students
      .filter((s) => s.fullName.toLowerCase().includes(q) || s.studentNumber.includes(q))
      .slice(0, 8);
  }, [students, linkStudentSearch]);

  const handleConfirmLinkStudent = (student: Student) => {
    if (!violationToLink) return;
    onUpdateViolation({
      ...violationToLink,
      studentId: student.id,
      studentNumber: student.studentNumber,
      studentName: student.fullName,
      grade: student.grade,
      section: student.section,
    });
    onShowToast(`تم ربط المخالفة بنجاح بالرقم الطلابي المعتمد (${student.studentNumber}) للطالب: ${student.fullName}`, 'success');
    setViolationToLink(null);
    setLinkStudentSearch('');
  };

  // Filtered catalog items based on picker degree
  const filteredCatalogItems = useMemo(() => {
    if (pickerDegreeFilter === 'all') return BYLAW_VIOLATIONS_CATALOG;
    if (pickerDegreeFilter === 'custom') return [];
    return BYLAW_VIOLATIONS_CATALOG.filter((item) => item.degree === pickerDegreeFilter);
  }, [pickerDegreeFilter]);

  // Selected Student Previous Violations Count (accurate real-time)
  const selectedStudentPreviousViolationsCount = useMemo(() => {
    if (!selectedStudent) return 0;
    const recorded = violations
      .filter(
        (v) => v.studentId === selectedStudent.id || v.studentNumber === selectedStudent.studentNumber
      )
      .reduce((count, v) => count + (v.violationsList ? v.violationsList.length : 1), 0);
    return Math.max(selectedStudent.totalViolations || 0, recorded);
  }, [selectedStudent, violations]);

  // Count prior occurrences of this exact catalog item for this student.
  // Legacy records have no code, so they are matched only by exact title.
  const countPreviousOccurrences = (student: Student | null, code: string, title: string) => {
    if (!student) return 0;
    return violations.reduce((count, record) => {
      if (record.studentId !== student.id && record.studentNumber !== student.studentNumber) return count;
      if (record.violationsList?.length) {
        return count + record.violationsList.filter(
          (item) => item.code === code || (!item.code && item.title === title)
        ).length;
      }
      return count + (record.violationType === title ? 1 : 0);
    }, 0);
  };

  // Ministerial Resolution 851/2018, Article 8. Unknown/custom rules go to
  // counselor/committee review; no deduction is guessed for them.
  const getOfficialPolicy = (degree: string, previousCount: number) => {
    const repetition = previousCount === 0
      ? 'حال ارتكابها'
      : previousCount === 1
        ? 'تكرار للمرة الأولى'
        : previousCount === 2
          ? 'تكرار للمرة الثانية'
          : 'تكرار للمرة الثالثة فأكثر';

    if (degree === 'الدرجة الأولى (بسيطة)') {
      if (previousCount === 0) return { repetition, deductionMarks: 0, action: 'تنبيه شفهي وتوجيه، مع توثيق المخالفة والإجراء المتخذ بالنموذج رقم 6.' };
      if (previousCount === 1) return { repetition, deductionMarks: 0, action: 'تنبيه خطي وتوثيق المخالفة، وإبلاغ ولي الأمر خطيًا بالنموذج رقم 7.' };
      if (previousCount === 2) return { repetition, deductionMarks: 2, action: 'استدعاء ولي الأمر، وتحويل الطالب للمرشد، وتوقيع تعهد بعدم التكرار وفق النماذج المحددة في اللائحة.' };
      if (previousCount === 3) return { repetition, deductionMarks: 4, action: 'استدعاء ولي الأمر في اليوم التالي، وإصدار تنبيه خطي للطالب وولي الأمر عند عدم الاستجابة، وفق النموذج رقم 9.' };
      return { repetition, deductionMarks: 0, action: 'تُعرض على لجنة إدارة السلوك لتقدير الإجراء والحسم وفتح ملف دراسة حالة وفق اللائحة.' };
    }

    if (degree === 'الدرجة الثانية (متوسطة)') {
      if (previousCount === 0) return { repetition, deductionMarks: 4, action: 'إصدار التنبيه الخطي الأول وتوقيع الطالب على تعهد، واستكمال دراسة الحالة، واستدعاء ولي الأمر لتوقيع اتفاقية تعديل السلوك، ومراقبة الطالب وجلسات التوجيه.' };
      if (previousCount === 1) return { repetition, deductionMarks: 8, action: 'عرض الحالة على لجنة إدارة السلوك، وإيقاف مؤقت لا يزيد على يومين، وإصدار الإنذار الكتابي الثاني وفق النموذج رقم 12.' };
      if (previousCount === 2) return { repetition, deductionMarks: 8, action: 'اجتماع فوري للجنة إدارة السلوك، وإيقاف من يوم إلى 3 أيام، وطلب دعم جهة مختصة، وإصدار الإنذار النهائي، والنقل التأديبي عند انطباق شروطه وفق النموذجين 13 و14.' };
      return { repetition, deductionMarks: 0, action: 'تُعرض على لجنة إدارة السلوك لتحديد الإجراء؛ لا توجد مرحلة تكرار إضافية محددة آليًا هنا.' };
    }

    if (degree === 'الدرجة الثالثة (جسيمة)') {
      if (previousCount === 0) return { repetition, deductionMarks: 12, action: 'إيقاف فوري داخل المدرسة وإحالة إلى لجنة إدارة السلوك والجهة المختصة وفق النموذج رقم 15.' };
      if (previousCount === 1) return { repetition, deductionMarks: 12, action: 'إيقاف فوري خارج المدرسة لحين انتهاء التحقيق، وإحالة فورية إلى لجنة إدارة السلوك والجهة المختصة، ومتابعة إجراءات النموذج رقم 16؛ أي نقل تأديبي بقرار الجهة المخولة.' };
      return { repetition, deductionMarks: 0, action: 'تُعرض على لجنة إدارة السلوك والجهة المختصة لتحديد الإجراء؛ لا يُقدّر النظام حسمًا إضافيًا.' };
    }

    if (degree === 'الدرجة الرابعة (شديدة الخطورة)') {
      return { repetition, deductionMarks: 0, action: 'إبلاغ مدير المدرسة والشؤون القانونية والجهات المختصة فورًا، وإيقاف الطالب لحين اكتمال التحقيق خلال مدة أقصاها يومَا عمل، ثم رفع الواقعة والأدلة إلى لجنة إدارة السلوك والجهة المخولة لاتخاذ القرار؛ الرسوب في مادة السلوك أو الفصل لا يُعتمد إلا بقرار الجهة المختصة.' };
    }

    return { repetition, deductionMarks: 0, action: 'مخالفة غير معتمدة في اللائحة؛ تُحال إلى لجنة إدارة السلوك للمراجعة دون حسم آلي.' };
  };

  const getPolicyForSelectedItem = (item: { code: string; title: string; degree: string }) => {
    if (item.code.startsWith('مخصص:')) {
      return {
        repetition: 'مراجعة اللجنة',
        deductionMarks: 0,
        action: 'مخالفة مخصصة غير معتمدة؛ تُحال إلى لجنة إدارة السلوك للمراجعة دون حسم آلي.',
      };
    }
    const isApprovedCatalogItem = BYLAW_VIOLATIONS_CATALOG.some((catalogItem) => catalogItem.code === item.code);
    if (!isApprovedCatalogItem) {
      return {
        repetition: 'مراجعة اللجنة',
        deductionMarks: 0,
        action: 'مخالفة مخصصة غير معتمدة؛ تُحال إلى لجنة إدارة السلوك للمراجعة دون حسم آلي.',
      };
    }
    const previousCount = countPreviousOccurrences(selectedStudent, item.code, item.title);
    return getOfficialPolicy(item.degree, previousCount);
  };

  const getGuidanceForItems = (items: NonNullable<ViolationRecord['violationsList']>) => {
    const actions = items.map((item) => getPolicyForSelectedItem(item).action);
    const thresholds = selectedStudent ? getCumulativeThresholdGuidance(selectedStudent, items) : [];
    return [...new Set([...actions, ...thresholds])].join('؛ ');
  };

  const getCumulativeThresholdGuidance = (
    student: Student,
    currentItems: NonNullable<ViolationRecord['violationsList']>
  ) => {
    const thresholds = [
      { degree: 'الدرجة الأولى (بسيطة)', marks: 10 },
      { degree: 'الدرجة الثانية (متوسطة)', marks: 20 },
    ];
    const notes: string[] = [];

    for (const rule of thresholds) {
      let previousMarks = 0;
      let hasLegacyUnknownMarks = false;

      violations
        .filter((record) => record.studentId === student.id || record.studentNumber === student.studentNumber)
        .forEach((record) => {
          if (record.violationsList) {
            previousMarks += record.violationsList
              .filter((item) => item.degree === rule.degree)
              .reduce((sum, item) => sum + (item.deductionMarks || 0), 0);
          } else if (record.violationDegree === rule.degree) {
            hasLegacyUnknownMarks = true;
          }
        });

      const currentMarks = currentItems
        .filter((item) => item.degree === rule.degree)
        .reduce((sum, item) => sum + (item.deductionMarks || 0), 0);

      if (hasLegacyUnknownMarks) {
        notes.push(`راجع سجل الحسم التراكمي لمخالفات ${rule.degree} للعام الدراسي الحالي؛ بعض السجلات القديمة لا تتضمن تفصيل الحسم.`);
      } else if (previousMarks + currentMarks >= rule.marks) {
        notes.push(`بلغ الحسم المسجل لمخالفات ${rule.degree} حد ${rule.marks} درجات؛ تأكد أن السجلات تخص العام الدراسي الحالي، ثم افتح ملف دراسة حالة واتبع توصيات لجنة إدارة السلوك.`);
      }
    }
    return notes;
  };

  // Calculated Total Deduction Marks
  const totalDeductionMarks = useMemo(() => {
    return selectedViolations.reduce((sum, v) => sum + (v.deductionMarks || 0), 0);
  }, [selectedViolations]);

  // Handle Catalog Selection
  const handleSelectCatalogItem = (code: string) => {
    setSelectedCatalogCode(code);
    const item = BYLAW_VIOLATIONS_CATALOG.find((b) => b.code === code);
    if (item) {
      const policy = getPolicyForSelectedItem(item);
      setSelectedRepetition(policy.repetition);
      setDeductionMarksInput(policy.deductionMarks);
      setSuggestedAction(policy.action);
    }
  };

  // Add violation to selectedViolations
  const handleAddViolationToIncident = () => {
    if (pickerDegreeFilter === 'custom') {
      if (!customViolationTitle.trim()) {
        onShowToast('يرجى كتابة عنوان أو مسمى المخالفة المخصصة', 'warning');
        return;
      }
      const customItem = {
        code: `مخصص:${customViolationCode.trim() || 'خاص'}`,
        degree: customViolationDegree,
        title: customViolationTitle.trim(),
        repetition: 'مراجعة اللجنة',
        deductionMarks: 0,
      };
      const nextItems = [...selectedViolations, customItem];
      setSelectedViolations(nextItems);
      setSuggestedAction(getGuidanceForItems(nextItems));
      setCustomViolationTitle('');
      onShowToast('تمت إضافة المخالفة المخصصة إلى الواقعة', 'info');
      return;
    }

    if (!selectedCatalogCode) {
      onShowToast('يرجى اختيار مخالفة من القائمة أولاً', 'warning');
      return;
    }

    const item = BYLAW_VIOLATIONS_CATALOG.find((b) => b.code === selectedCatalogCode);
    if (!item) {
      onShowToast('المخالفة المختارة غير معرفة في اللائحة', 'error');
      return;
    }

    const alreadyExists = selectedViolations.some(
      (v) => v.code === item.code && v.title === item.title
    );
    if (alreadyExists) {
      onShowToast('هذه المخالفة مضافة بالفعل في قائمة المخالفات المختارة', 'warning');
      return;
    }

    if (!selectedStudent) {
      onShowToast('يرجى تحديد الطالب أولًا لحساب تكرار المخالفة من سجله', 'warning');
      return;
    }

    const policy = getPolicyForSelectedItem(item);
    setSelectedRepetition(policy.repetition);
    setDeductionMarksInput(policy.deductionMarks);
    const addedItem = {
      code: item.code,
      degree: item.degree,
      title: item.title,
      repetition: policy.repetition,
      deductionMarks: policy.deductionMarks,
    };
    const nextItems = [...selectedViolations, addedItem];
    setSelectedViolations(nextItems);
    setSuggestedAction(getGuidanceForItems(nextItems));

    onShowToast(`تمت إضافة «${item.title}» إلى المخالفات المختارة`, 'info');
    setSelectedCatalogCode('');
  };

  // Remove violation from selectedViolations
  const handleRemoveViolationFromIncident = (index: number) => {
    const nextItems = selectedViolations.filter((_, i) => i !== index);
    setSelectedViolations(nextItems);
    setSuggestedAction(getGuidanceForItems(nextItems));
    onShowToast('تمت إزالة المخالفة من الواقعة', 'info');
  };

  // Autocomplete students
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    return students
      .filter(
        (s) =>
          s.fullName.includes(studentSearch.trim()) ||
          s.studentNumber.includes(studentSearch.trim())
      )
      .slice(0, 5);
  }, [students, studentSearch]);

  // AI Rephrase Trigger (Drafting Assistant)
  const handleTriggerAiRephrase = async () => {
    if (!incidentDescription.trim()) {
      onShowToast('يرجى كتابة وصف الواقعة أولاً ليتمكن الذكاء الاصطناعي من تحسين صياغتها', 'warning');
      return;
    }
    setIsAiLoading(true);
    try {
      const currentDeg = (selectedViolations[0]?.degree as ViolationDegree) || 'الدرجة الأولى (بسيطة)';
      const result = await rephraseIncidentWithAI(incidentDescription, {
        location: incidentLocation,
        degree: currentDeg,
      });
      setOriginalDraftText(incidentDescription);
      setAiResult(result);
      setAiEditedText(result.improvedText);
      setIsAiModalOpen(true);
    } catch (err: any) {
      console.error('Error during AI rephrasing:', err);
      onShowToast('تعذر تحسين الصياغة حالياً، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Counselor Approves and Accepts the AI Wording (with any counselor tweaks)
  const handleApplyAiRephrase = () => {
    const textToApply = aiEditedText.trim() || aiResult?.improvedText || '';
    if (textToApply) {
      setIncidentDescription(textToApply);
      setIsAiModalOpen(false);
      onShowToast('تم اعتماد وتطبيق الصياغة الرسمية الموضوعية بنجاح في حقل وصف الواقعة', 'success');
    }
  };

  // Counselor Rejects the AI Wording and keeps original draft
  const handleRejectAiRephrase = () => {
    setIsAiModalOpen(false);
    onShowToast('تم الاحتفاظ بالصياغة الأصلية كما كتبها المستخدم دون أي تعديل', 'info');
  };

  // Submit Violation Form
  const handleSubmitViolation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      onShowToast('يرجى تحديد الطالب المخالف من نتائج البحث', 'error');
      return;
    }

    if (selectedViolations.length === 0) {
      onShowToast('يرجى اختيار وإضافة مخالفة واحدة على الأقل إلى الواقعة السلوكية', 'error');
      return;
    }

    if (!incidentDescription.trim()) {
      onShowToast('يرجى كتابة وصف تفصيلي للواقعة', 'error');
      return;
    }

    const finalLocation = incidentLocation === 'أخرى' ? (customLocation || 'أخرى') : incidentLocation;

    // Calculate highest degree among selected violations for backward compatibility
    const degreeRanks: Record<string, number> = {
      'الدرجة الرابعة (شديدة الخطورة)': 4,
      'الدرجة الثالثة (جسيمة)': 3,
      'الدرجة الثانية (متوسطة)': 2,
      'الدرجة الأولى (بسيطة)': 1,
    };
    let highestDeg: ViolationDegree = 'الدرجة الأولى (بسيطة)';
    let maxRank = 0;
    for (const v of selectedViolations) {
      const r = degreeRanks[v.degree] || 1;
      if (r > maxRank) {
        maxRank = r;
        highestDeg = v.degree as ViolationDegree;
      }
    }

    const primaryType =
      selectedViolations.length === 1
        ? selectedViolations[0].title
        : `${selectedViolations[0].title} (+${selectedViolations.length - 1} مخالفات أخرى)`;

    const isMultiViolationIncident = selectedViolations.length > 1;
    const cumulativeThresholdNotes = getCumulativeThresholdGuidance(selectedStudent, selectedViolations);
    const finalSuggestedAction = getGuidanceForItems(selectedViolations);
    const requiresCommitteeReview = selectedViolations.some((item) => {
      const policy = getPolicyForSelectedItem(item);
      return item.code.startsWith('مخصص:') ||
        item.degree === 'الدرجة الثالثة (جسيمة)' ||
        item.degree === 'الدرجة الرابعة (شديدة الخطورة)' ||
        policy.action.includes('تُعرض على لجنة') ||
        policy.action.includes('إحالة فورية إلى لجنة');
    }) || cumulativeThresholdNotes.length > 0;

    onAddViolation({
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.studentNumber,
      studentName: selectedStudent.fullName,
      grade: selectedStudent.grade,
      section: selectedStudent.section,
      violationType: primaryType,
      violationDegree: highestDeg,
      incidentDateTime,
      incidentLocation: finalLocation,
      reportingPerson,
      incidentDescription: incidentDescription.trim(),
      suggestedAction: finalSuggestedAction || suggestedAction.trim(),
      counselorNotes: counselorNotes.trim() || undefined,
      status: requiresCommitteeReview ? 'مسودة' : status,
      recordedBy: counselor?.name || 'أ. أمير علي عبدالشاكر بكري',
      isMultiViolationIncident,
      violationsList: selectedViolations,
      totalDeductionMarks,
      originalDescription: originalDraftText || undefined,
    });

    onShowToast(`تم تسجيل الواقعة السلوكية بنجاح للطالب: ${selectedStudent.fullName}`, 'success');

    // Reset Form
    setSelectedStudent(null);
    setStudentSearch('');
    setSelectedViolations([]);
    setSelectedCatalogCode('');
    setSelectedRepetition('حال ارتكابها');
    setDeductionMarksInput(0);
    setSuggestedAction('');
    setIncidentDescription('');
    setCounselorNotes('');
    setOriginalDraftText('');
    setAiEditedText('');
    setShowAddForm(false);
  };

  // Quick Status Updater for existing violations
  const handleQuickStatusChange = (violation: ViolationRecord, newStatus: ViolationStatus) => {
    onUpdateViolation({
      ...violation,
      status: newStatus,
    });
    onShowToast(`تم تحديث حالة المخالفة إلى: ${newStatus}`, 'info');
  };

  // Date extraction helper
  const getViolationDateString = (v: ViolationRecord): string => {
    if (v.createdAt && /^\d{4}-\d{2}-\d{2}/.test(v.createdAt)) {
      return v.createdAt.slice(0, 10);
    }
    if (v.incidentDateTime) {
      const match = v.incidentDateTime.match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    if (v.createdAt) {
      const d = new Date(v.createdAt);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    return '';
  };

  // Dynamic available violation types for dropdown
  const availableViolationTypes = useMemo(() => {
    const typeSet = new Set<string>();
    [
      'استخدام الهاتف المتحرك داخل الصف دون إذن',
      'الغياب بدون عذر مقبول',
      'الهروب من الحصة أو المدرسة',
      'الاعتداء اللفظي أو الشجار',
      'مخالفة الزي المدرسي والمظهر العام',
      'إتلاف الممتلكات المدرسية',
      'التنمر أو الإساءة للآخرين',
      'إثارة الفوضى داخل الصف',
      'عدم إحضار الكتب واللوازم المدرسية',
      'التأخر المتكرر عن طابور الصباح',
      'عدم أداء الواجبات المدرسية',
      'التطاول على الهيئة التعليمية أو الإدارية',
    ].forEach((t) => typeSet.add(t));
    violations.forEach((v) => {
      if (v.violationType) typeSet.add(v.violationType);
    });
    return Array.from(typeSet).sort();
  }, [violations]);

  // Handle Preset Date Range
  const handlePresetDateChange = (preset: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setDateRangePreset(preset);
    const today = getUaeTodayDateString();
    if (preset === 'all') {
      setFilterDateFrom('');
      setFilterDateTo('');
    } else if (preset === 'today') {
      setFilterDateFrom(today);
      setFilterDateTo(today);
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const weekAgo = d.toISOString().slice(0, 10);
      setFilterDateFrom(weekAgo);
      setFilterDateTo(today);
    } else if (preset === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const monthAgo = d.toISOString().slice(0, 10);
      setFilterDateFrom(monthAgo);
      setFilterDateTo(today);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setTableSearch('');
    setFilterViolationType('all');
    setFilterStatus('all');
    setFilterDegree('all');
    setFilterReliability('all');
    setDateRangePreset('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Filtered violations list based on search (student name or ID), violation type, status, and date range
  const displayViolations = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return violations.filter((v) => {
      // 1. Search by student name or student ID
      const matchSearch =
        q === '' ||
        v.studentName.toLowerCase().includes(q) ||
        v.studentNumber.toLowerCase().includes(q);

      // 2. Filter by violation type
      const matchType =
        filterViolationType === 'all' || v.violationType === filterViolationType;

      // 3. Filter by status
      const matchStatus = filterStatus === 'all' || v.status === filterStatus;

      // 4. Filter by degree
      const matchDegree =
        filterDegree === 'all' || v.violationDegree.includes(filterDegree);

      // 5. Filter by date range
      let matchDate = true;
      const recDate = getViolationDateString(v);
      if (filterDateFrom && recDate) {
        if (recDate < filterDateFrom) matchDate = false;
      }
      if (filterDateTo && recDate) {
        if (recDate > filterDateTo) matchDate = false;
      }

      // 6. Filter by student number link reliability
      let matchReliability = true;
      if (filterReliability === 'verified') {
        matchReliability = isRecordReliablyLinked(v);
      } else if (filterReliability === 'unlinked') {
        matchReliability = !isRecordReliablyLinked(v);
      }

      return matchSearch && matchType && matchStatus && matchDegree && matchDate && matchReliability;
    });
  }, [
    violations,
    students,
    tableSearch,
    filterViolationType,
    filterStatus,
    filterDegree,
    filterReliability,
    filterDateFrom,
    filterDateTo,
  ]);

  const getDegreeBadge = (degree: ViolationDegree) => {
    if (degree.includes('الأولى')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (degree.includes('الثانية')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (degree.includes('الثالثة')) {
      return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    }
    return 'bg-red-900 text-white font-black';
  };

  const getStatusBadge = (st: ViolationStatus) => {
    switch (st) {
      case 'مسودة':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'تم التنبيه':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'تم توقيع الطالب':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'تم توقيع ولي الأمر':
        return 'bg-teal-50 text-teal-800 border-teal-300';
      case 'تم الحفظ في ملف الطالب':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'تم رفعها على موقع الوزارة':
        return 'bg-blue-100 text-blue-900 border-blue-400 font-bold';
      case 'مغلقة':
        return 'bg-slate-200 text-slate-800 border-slate-400';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Switcher: Violations Registry vs Official Forms & Signatures Module */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="tab-btn-violations-registry"
            onClick={() => setActivePageTab('violations')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activePageTab === 'violations'
                ? 'bg-[#006D77] text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>سجل المخالفات والوقائع السلوكية</span>
          </button>

          <button
            type="button"
            id="tab-btn-official-forms"
            onClick={() => setActivePageTab('official-forms')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activePageTab === 'official-forms'
                ? 'bg-[#0C2340] text-white shadow-sm border border-[#D4AF37]/50'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSignature className="w-4 h-4 text-[#D4AF37]" />
            <span>وحدة النماذج والتوقيعات الرسمية (نموذج 6...)</span>
          </button>
        </div>

        {activePageTab === 'violations' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePageTab('official-forms')}
              className="px-3 py-1.5 text-xs font-bold text-[#0C2340] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSignature className="w-3.5 h-3.5 text-amber-700" />
              <span>فتح وحدة النماذج المعتمدة</span>
            </button>
          </div>
        )}
      </div>

      {activePageTab === 'official-forms' ? (
        <OfficialDocumentsManager
          students={students}
          violations={violations}
          currentUser={counselor as any}
          onShowToast={onShowToast}
          initialSelectedStudentId={preselectedStudentId}
        />
      ) : (
        <>
          {/* Top Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 w-fit mb-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>لائحة إدارة سلوك الطلبة في مؤسسات التعليم المدرسي</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                سجل المخالفات والإجراءات السلوكية
              </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق الحالات السلوكية ومتابعة مسار الإجراءات وصياغة الوقائع بموضوعية ودقة تربوية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {onOpenViolationReportForStudent && (
            <button
              type="button"
              id="btn-create-violation-report-page-top"
              onClick={() => onOpenViolationReportForStudent('')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0C2340] hover:bg-[#163761] rounded-xl shadow-xs transition-colors flex items-center gap-2 border border-[#D4AF37]/40 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              <span>إنشاء تقرير مخالفة (نموذج 6)</span>
            </button>
          )}

          {!isViewer && (
            <button
              type="button"
              id="btn-toggle-add-violation"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  <span>إغلاق النموذج</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>تسجيل مخالفة جديدة</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Manual Review Alert for Unlinked Legacy Records */}
      {unlinkedLegacyViolationsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>تنبيه المراجعة اليدوية للسجلات السابقة</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-200 text-amber-900 font-bold">
                  {unlinkedLegacyViolationsCount} سجل غير مؤكد
                </span>
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                تطبيقًا للائحة، لا يتم ربط المخالفات بالطلبة بالتخمين. هذه السجلات القديمة تفتقر لرقم طلابي مؤكد في قائمة طلاب المدرسة، وتُعرض للمراجعة اليدوية لربطها بالرقم الطلابي الصحيح.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFilterReliability(filterReliability === 'unlinked' ? 'all' : 'unlinked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterReliability === 'unlinked'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {filterReliability === 'unlinked' ? 'عرض كافة السجلات' : `تصفية للمراجعة اليدوية (${unlinkedLegacyViolationsCount})`}
            </button>
          </div>
        </div>
      )}

      {/* ADD VIOLATION FORM */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border-2 border-[#006D77]/50 shadow-md p-6 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  تحرير واقعة سلوكية جديدة
                </h3>
                <p className="text-xs text-slate-500">
                  تعبئة بيانات الواقعة وفق تصنيفات اللائحة المعتمدة
                </p>
              </div>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              المرشد: <strong>{counselor?.name || 'أ. أمير علي عبدالشاكر بكري'}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmitViolation} className="space-y-4">
            {/* 1. STUDENT SELECTION & BRIEF CARD */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#006D77]" />
                  <span>تحديد الطالب المخالف للواقعة السلوكية</span>
                  <span className="text-rose-600">*</span>
                </label>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearch('');
                      setSelectedViolations([]);
                      setSelectedCatalogCode('');
                      setSelectedRepetition('حال ارتكابها');
                      setDeductionMarksInput(0);
                      setSuggestedAction('');
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تغيير الطالب</span>
                  </button>
                )}
              </div>

              {!selectedStudent ? (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="ابحث باسم الطالب أو رقمه الطلابي..."
                      className="w-full pr-10 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
                  </div>

                  {/* Suggestions */}
                  {filteredStudents.length > 0 && (
                    <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-md divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentSearch(s.fullName);
                            if (selectedCatalogCode) {
                              const selectedItem = BYLAW_VIOLATIONS_CATALOG.find((entry) => entry.code === selectedCatalogCode);
                              if (selectedItem) {
                                const priorCount = countPreviousOccurrences(s, selectedItem.code, selectedItem.title);
                                const policy = getOfficialPolicy(selectedItem.degree, priorCount);
                                setSelectedRepetition(policy.repetition);
                                setDeductionMarksInput(policy.deductionMarks);
                                setSuggestedAction(policy.action);
                              }
                            }
                          }}
                          className="p-2.5 hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#006D77]/10 text-[#006D77] flex items-center justify-center font-bold text-xs">
                              {s.fullName.slice(0, 1)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{s.fullName}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                الرقم: {s.studentNumber}
                              </span>
                            </div>
                          </div>
                          <span className="text-slate-600 font-medium">
                            الصف {s.grade} ({s.section}) • المسار {s.track}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Brief Selected Student Card: Name, Student ID, Grade, Section, Track, Previous Violations Count */
                <div className="bg-white p-3.5 rounded-xl border-2 border-[#006D77]/40 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                        {selectedStudent.fullName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">
                            {selectedStudent.fullName}
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            تم تحديد الطالب
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          الرقم الطلابي: {selectedStudent.studentNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">الاسم:</span>
                      <span className="font-bold text-slate-900 truncate block" title={selectedStudent.fullName}>
                        {selectedStudent.fullName}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">الرقم الطلابي:</span>
                      <span className="font-mono font-bold text-[#006D77] block">
                        {selectedStudent.studentNumber}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">الصف:</span>
                      <span className="font-bold text-slate-800 block">
                        الصف {selectedStudent.grade}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">الشعبة:</span>
                      <span className="font-bold text-slate-800 block">
                        {selectedStudent.section}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block">المسار:</span>
                      <span className="font-bold text-slate-800 block">
                        {selectedStudent.track}
                      </span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-800 block">المخالفات السابقة:</span>
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>{selectedStudentPreviousViolationsCount} مخالفة</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. VIOLATIONS SELECTION (ONE OR MULTIPLE VIOLATIONS) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-bold text-slate-800">
                    اختيار المخالفات وفق اللائحة الوزارية (يمكن اختيار أكثر من مخالفة لنفس الواقعة)
                  </span>
                  <span className="text-rose-600">*</span>
                </div>

                {/* Degree Tabs Filter */}
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: 'all', label: 'جميع الدرجات' },
                    { id: 'الدرجة الأولى (بسيطة)', label: 'الأولى (بسيطة)' },
                    { id: 'الدرجة الثانية (متوسطة)', label: 'الثانية (متوسطة)' },
                    { id: 'الدرجة الثالثة (جسيمة)', label: 'الثالثة (جسيمة)' },
                    { id: 'الدرجة الرابعة (شديدة الخطورة)', label: 'الرابعة (خطيرة)' },
                    { id: 'custom', label: 'مخالفة خاصة' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPickerDegreeFilter(tab.id);
                        setSelectedCatalogCode('');
                        if (tab.id === 'custom') {
                          setSelectedRepetition('مراجعة اللجنة');
                          setDeductionMarksInput(0);
                          setSuggestedAction(selectedViolations.length ? getGuidanceForItems(selectedViolations) : 'مخالفة مخصصة غير معتمدة؛ تُحال إلى لجنة إدارة السلوك للمراجعة دون حسم آلي.');
                        }
                      }}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        pickerDegreeFilter === tab.id
                          ? 'bg-[#006D77] text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector Controls */}
              {pickerDegreeFilter === 'custom' ? (
                /* Custom Violation Inputs */
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        مسمى المخالفة المخصصة <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={customViolationTitle}
                        onChange={(e) => setCustomViolationTitle(e.target.value)}
                        placeholder="اكتب وصف ومسمى المخالفة بالتحديد..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الدرجة المقدرة
                      </label>
                      <select
                        value={customViolationDegree}
                        onChange={(e) => setCustomViolationDegree(e.target.value as ViolationDegree)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#006D77]"
                      >
                        <option value="الدرجة الأولى (بسيطة)">الدرجة الأولى (بسيطة)</option>
                        <option value="الدرجة الثانية (متوسطة)">الدرجة الثانية (متوسطة)</option>
                        <option value="الدرجة الثالثة (جسيمة)">الدرجة الثالثة (جسيمة)</option>
                        <option value="الدرجة الرابعة (شديدة الخطورة)">الدرجة الرابعة (شديدة الخطورة)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        كود / رمز البند
                      </label>
                      <input
                        type="text"
                        value={customViolationCode}
                        onChange={(e) => setCustomViolationCode(e.target.value)}
                        placeholder="مثال: بند خاص"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#006D77]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        التكرار
                      </label>
                      <select
                        value={selectedRepetition}
                        disabled
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                      >
                        <option value="مراجعة اللجنة">مراجعة اللجنة</option>
                        <option value="حال ارتكابها">حال ارتكابها (المرة الأولى)</option>
                        <option value="تكرار للمرة الأولى">تكرار للمرة الأولى</option>
                        <option value="تكرار للمرة الثانية">تكرار للمرة الثانية</option>
                        <option value="تكرار للمرة الثالثة فأكثر">تكرار للمرة الثالثة فأكثر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        درجات الحسم المقدرة
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={deductionMarksInput}
                        disabled
                        title="يتم تحديد الحسم وفق اللائحة؛ المخالفات غير المعتمدة تُحال للجنة دون حسم آلي"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-[#006D77]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddViolationToIncident}
                      className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة المخالفة المخصصة للواقعة</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Catalog Item Selection */
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-6">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        اختر بند المخالفة من اللائحة ({filteredCatalogItems.length} مخالفة متاحة) <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={selectedCatalogCode}
                        onChange={(e) => handleSelectCatalogItem(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] truncate"
                      >
                        <option value="">-- اختر البند السلوكي من اللائحة --</option>
                        {filteredCatalogItems.map((item) => (
                          <option key={item.code} value={item.code}>
                            [{item.code}] {item.title} ({item.degree})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        حالة التكرار
                      </label>
                      <select
                        value={selectedRepetition}
                        disabled
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                      >
                        <option value="مراجعة اللجنة">مراجعة اللجنة</option>
                        <option value="حال ارتكابها">حال ارتكابها (المرة الأولى)</option>
                        <option value="تكرار للمرة الأولى">تكرار للمرة الأولى</option>
                        <option value="تكرار للمرة الثانية">تكرار للمرة الثانية</option>
                        <option value="تكرار للمرة الثالثة فأكثر">تكرار للمرة الثالثة فأكثر</option>
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        درجات الحسم (تلقائي / قابل للتعديل)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={deductionMarksInput}
                          disabled
                          title="يتم تحديد الحسم وفق اللائحة ولا يُعدّل من صفحة تسجيل الواقعة"
                          className="w-20 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-[#006D77]"
                        />
                        <button
                          type="button"
                          onClick={handleAddViolationToIncident}
                          disabled={!selectedCatalogCode}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedCatalogCode
                              ? 'bg-[#006D77] hover:bg-[#005a63] text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة للواقعة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. SELECTED VIOLATIONS ("المخالفات المختارة") */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#006D77]" />
                  <h4 className="text-xs font-black text-slate-900">
                    المخالفات المختارة للواقعة السلوكية ({selectedViolations.length})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200 shadow-2xs">
                    إجمالي درجات الحسم المحسوبة: {totalDeductionMarks} درجات
                  </span>
                </div>
              </div>

              {selectedViolations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                  <AlertTriangle className="w-6 h-6 text-[#D4AF37] mx-auto mb-1.5 opacity-70" />
                  <p className="font-bold text-slate-700">لم يتم اختيار أي مخالفات لهذه الواقعة بعد</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    اختر مخالفة من قسم «اختيار المخالفات» أعلاه ثم انقر على زر «إضافة للواقعة»
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedViolations.map((vItem, index) => (
                    <div
                      key={`${vItem.code}-${index}`}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#006D77]/40 transition-colors"
                    >
                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#0C2340] text-[#D4AF37] font-mono text-xs font-bold">
                          {vItem.code}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-md border font-bold ${getDegreeBadge(
                            vItem.degree as ViolationDegree
                          )}`}
                        >
                          {vItem.degree}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {vItem.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        {vItem.repetition && (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            التكرار: {vItem.repetition}
                          </span>
                        )}
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          حسم: {vItem.deductionMarks || 0} درجات
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveViolationFromIncident(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="إزالة هذه المخالفة من الواقعة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. INCIDENT DETAILS (بيانات الواقعة) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مكان الواقعة
                </label>
                <select
                  value={incidentLocation}
                  onChange={(e) => setIncidentLocation(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                >
                  <option value="الصف الدراسي">الصف الدراسي</option>
                  <option value="ساحة المدرسة / الطابور">ساحة المدرسة / الطابور</option>
                  <option value="الممر الرئيسي">الممر الرئيسي</option>
                  <option value="المقصف المدرسي">المقصف المدرسي</option>
                  <option value="الحافلة المدرسية">الحافلة المدرسية</option>
                  <option value="المختبر / ورشة العمل">المختبر / ورشة العمل</option>
                  <option value="الصالة الرياضية">الصالة الرياضية</option>
                  <option value="أخرى">أخرى</option>
                </select>
                {incidentLocation === 'أخرى' && (
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="حدد المكان بدقة..."
                    className="mt-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                )}
              </div>

              {/* Reporting Person */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم مُبلغ الواقعة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={reportingPerson}
                  onChange={(e) => setReportingPerson(e.target.value)}
                  placeholder="مثال: أ. أحمد (معلم الرياضيات)، المشرف الإداري..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                  required
                />
              </div>

              {/* Incident Date & Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ ووقت الواقعة
                </label>
                <input
                  type="text"
                  value={incidentDateTime}
                  onChange={(e) => setIncidentDateTime(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حالة المخالفة <span className="text-rose-600">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ViolationStatus)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#006D77]"
                >
                  <option value="مسودة">مسودة</option>
                  <option value="تم التنبيه">تم التنبيه</option>
                  <option value="تم توقيع الطالب">تم توقيع الطالب</option>
                  <option value="تم توقيع ولي الأمر">تم توقيع ولي الأمر</option>
                  <option value="تم الحفظ في ملف الطالب">تم الحفظ في ملف الطالب</option>
                  <option value="تم رفعها على موقع الوزارة">تم رفعها على موقع الوزارة</option>
                  <option value="مغلقة">مغلقة</option>
                </select>
              </div>
            </div>

            {/* Description Textarea + AI Rephrasing Button */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  وصف الواقعة وتفاصيلها <span className="text-rose-600">*</span>
                </label>

                {/* AI-powered 'Improve Incident Wording' Button */}
                <button
                  type="button"
                  id="btn-ai-rephrase"
                  onClick={handleTriggerAiRephrase}
                  disabled={isAiLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-[#006D77] border border-[#006D77]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer disabled:opacity-60"
                  title="تحسين صياغة الواقعة بالذكاء الاصطناعي / Improve Incident Wording with AI"
                  aria-label="Improve Incident Wording with AI"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#006D77] animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] group-hover:rotate-12 transition-transform" />
                  )}
                  <span>
                    {isAiLoading
                      ? 'جارٍ تحسين الصياغة بالذكاء الاصطناعي...'
                      : 'تحسين صياغة الواقعة بالذكاء الاصطناعي (Improve Incident Wording with AI)'}
                  </span>
                </button>
              </div>

              <textarea
                rows={4}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                placeholder="اكتب تفاصيل ما حدث بدقة وموضوعية (يمكنك كتابتها بأسلوبك ثم النقر على زر تحسين الصياغة بالذكاء الاصطناعي لإعادة ترتيبها رسميًا)..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white leading-relaxed"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                * ملاحظة: الذكاء الاصطناعي يقدم مسودة مقترحة بأسلوب رسمي موضوعي خالٍ من الاتهام أو التهويل، مع إمكانية المراجعة والتعديل والقبول أو الرفض. القرار النهائي للمرشد.
              </p>
            </div>

            {/* Suggested Action & Counselor Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الإجراء المقترح (وفق لائحة السلوك)
                </label>
                <input
                  type="text"
                  value={suggestedAction}
                  readOnly
                  placeholder="مثال: جلسة توجيه، تنبيه خطي، استدعاء ولي الأمر..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات وتوجيهات المرشد
                </label>
                <input
                  type="text"
                  value={counselorNotes}
                  onChange={(e) => setCounselorNotes(e.target.value)}
                  placeholder="أي ملاحظات إرشادية حول استجابة الطالب واستعداده للتعديل..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                id="btn-save-violation"
                className="px-6 py-2 text-xs font-bold text-white bg-[#0C2340] hover:bg-[#123157] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>حفظ المخالفة في السجل</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Rephrase Review, Edit & Approval Modal (Drafting Assistant) */}
      {isAiModalOpen && aiResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-right flex flex-col max-h-[90vh]">
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
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    النص الأصلي المدخل:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {originalDraftText.length} حرف
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-slate-200/80">
                  {originalDraftText}
                </p>
              </div>

              {/* Editable Rephrased Text Box */}
              <div className="bg-teal-50/70 p-4 rounded-xl border-2 border-[#006D77]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#006D77] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>الصياغة الرسمية المقترحة (قابلة للتعديل المباشر):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-bold text-teal-800 border border-teal-200">
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
                    className="w-full p-3 bg-white border border-[#006D77]/30 rounded-xl text-xs sm:text-sm text-slate-900 leading-relaxed font-medium focus:ring-2 focus:ring-[#006D77] focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
                    <span className="flex items-center gap-1 text-[#006D77] font-medium">
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
                  <span className="text-xs font-bold text-slate-700 block">
                    أبرز التحسينات التربوية والقانونية المطبقة على الصياغة:
                  </span>
                  <ul className="space-y-1.5">
                    {aiResult.keyChanges.map((change, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Legal and Counselor Decision Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>تنبيه إداري وتربوي:</strong> هذه الميزة مخصصة للمساعدة في صياغة المسودة بأسلوب إداري موضوعي خالٍ من الانفعال أو التهويل؛ ولا تنفذ أي إجراء أو قرار تلقائي، والقرار النهائي للاعتماد يعود للمرشد المدرسي والمستخدم المخول.
                </p>
              </div>
            </div>

            {/* Modal Actions: Accept, Reject, Edit */}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] text-slate-500">
                اختر قبول الصياغة لاعتمادها في وصف الواقعة أو رفضها للاحتفاظ بالنص الأصلي
              </span>

              <div className="flex items-center gap-2">
                {/* Reject Option */}
                <button
                  type="button"
                  id="btn-reject-ai-rephrase"
                  onClick={handleRejectAiRephrase}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="رفض الصياغة المقترحة والاحتفاظ بالأصل"
                >
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>رفض والاحتفاظ بالأصل (Reject)</span>
                </button>

                {/* Accept Option */}
                <button
                  type="button"
                  id="btn-confirm-ai-rephrase"
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

      {/* Filter and Violations List/Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#006D77]" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>سجل وقائمة المخالفات السلوكية ({displayViolations.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تصفية متقدمة حسب اسم أو رقم الطالب، نوع المخالفة، الحالة، والمدى الزمني
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* View Mode Switcher (Cards vs Table) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                id="btn-view-cards"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#006D77] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض البطاقات المفصلة"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>بطاقات</span>
              </button>
              <button
                type="button"
                id="btn-view-table"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#006D77] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض الجدول المنظم"
              >
                <List className="w-3.5 h-3.5" />
                <span>جدول</span>
              </button>
            </div>

            {/* Reset Filters Button */}
            {(tableSearch || filterViolationType !== 'all' || filterStatus !== 'all' || filterDegree !== 'all' || filterDateFrom || filterDateTo) && (
              <button
                type="button"
                id="btn-reset-violation-filters"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط التصفية</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
          {/* 1. Search by Student Name or ID */}
          <div className="lg:col-span-3 space-y-1">
            <label htmlFor="violations-table-search" className="block text-xs font-bold text-slate-700">
              البحث باسم الطالب أو الرقم:
            </label>
            <div className="relative">
              <input
                type="text"
                id="violations-table-search"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="اكتب اسم الطالب أو رقمه الطلابي..."
                className="w-full pr-8 pl-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#006D77] transition-all shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Violation Type Filter */}
          <div className="lg:col-span-3 space-y-1">
            <label htmlFor="violations-type-filter" className="block text-xs font-bold text-slate-700">
              نوع المخالفة:
            </label>
            <select
              id="violations-type-filter"
              value={filterViolationType}
              onChange={(e) => setFilterViolationType(e.target.value)}
              className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] shadow-2xs truncate"
            >
              <option value="all">جميع أنواع المخالفات</option>
              {availableViolationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div className="lg:col-span-2 space-y-1">
            <label htmlFor="violations-status-filter" className="block text-xs font-bold text-slate-700">
              حالة المخالفة:
            </label>
            <select
              id="violations-status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] shadow-2xs"
            >
              <option value="all">جميع الحالات</option>
              <option value="مسودة">مسودة</option>
              <option value="تم التنبيه">تم التنبيه</option>
              <option value="تم توقيع الطالب">تم توقيع الطالب</option>
              <option value="تم توقيع ولي الأمر">تم توقيع ولي الأمر</option>
              <option value="تم الحفظ في ملف الطالب">تم الحفظ في ملف الطالب</option>
              <option value="تم رفعها على موقع الوزارة">تم رفعها على موقع الوزارة</option>
              <option value="مغلقة">مغلقة</option>
            </select>
          </div>

          {/* 4. Degree Filter */}
          <div className="lg:col-span-2 space-y-1">
            <label htmlFor="violations-degree-filter" className="block text-xs font-bold text-slate-700">
              درجة المخالفة:
            </label>
            <select
              id="violations-degree-filter"
              value={filterDegree}
              onChange={(e) => setFilterDegree(e.target.value)}
              className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] shadow-2xs"
            >
              <option value="all">جميع الدرجات</option>
              <option value="الأولى">الدرجة الأولى</option>
              <option value="الثانية">الدرجة الثانية</option>
              <option value="الثالثة">الدرجة الثالثة</option>
              <option value="الرابعة">الدرجة الرابعة</option>
            </select>
          </div>

          {/* 5. Reliability / Linkage Filter */}
          <div className="lg:col-span-2 space-y-1">
            <label htmlFor="violations-reliability-filter" className="block text-xs font-bold text-slate-700">
              ربط الرقم الطلابي:
            </label>
            <select
              id="violations-reliability-filter"
              value={filterReliability}
              onChange={(e) => setFilterReliability(e.target.value as any)}
              className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] shadow-2xs"
            >
              <option value="all">كافة السجلات</option>
              <option value="verified">مرتبطة برقم مؤكد</option>
              <option value="unlinked">مراجعة يدوية ({unlinkedLegacyViolationsCount})</option>
            </select>
          </div>

          {/* 5. Date Range Filter */}
          <div className="lg:col-span-12 space-y-1.5 pt-1 border-t border-slate-200/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700">
                النطاق الزمني للمخالفات (تصفية التاريخ):
              </label>

              {/* Date Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePresetDateChange('all')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateRangePreset === 'all'
                      ? 'bg-[#006D77] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  كافة التواريخ
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDateChange('today')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateRangePreset === 'today'
                      ? 'bg-[#006D77] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDateChange('week')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateRangePreset === 'week'
                      ? 'bg-[#006D77] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  آخر 7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDateChange('month')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateRangePreset === 'month'
                      ? 'bg-[#006D77] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  آخر شهر
                </button>
              </div>
            </div>

            {/* From and To Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">من تاريخ:</span>
                <input
                  type="date"
                  id="violations-date-from"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setDateRangePreset('custom');
                  }}
                  className="w-full bg-transparent text-xs font-mono font-medium focus:outline-hidden"
                />
                {filterDateFrom && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDateFrom('');
                      setDateRangePreset('custom');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    title="مسح تاريخ البدء"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">إلى تاريخ:</span>
                <input
                  type="date"
                  id="violations-date-to"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setDateRangePreset('custom');
                  }}
                  className="w-full bg-transparent text-xs font-mono font-medium focus:outline-hidden"
                />
                {filterDateTo && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDateTo('');
                      setDateRangePreset('custom');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    title="مسح تاريخ الانتهاء"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#006D77]" />
            <span>
              عرض <strong className="text-[#006D77] font-black">{displayViolations.length}</strong> مخالفة مطابقة
            </span>
          </div>

          {tableSearch.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
              طالب: &quot;{tableSearch.trim()}&quot;
              <button type="button" onClick={() => setTableSearch('')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterViolationType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-[#006D77] border border-teal-200 text-[11px] font-bold max-w-xs truncate">
              النوع: {filterViolationType}
              <button type="button" onClick={() => setFilterViolationType('all')} className="hover:text-rose-600 shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
              الحالة: {filterStatus}
              <button type="button" onClick={() => setFilterStatus('all')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterDegree !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
              الدرجة: {filterDegree}
              <button type="button" onClick={() => setFilterDegree('all')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filterDateFrom || filterDateTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
              الفترة: {filterDateFrom || 'البداية'} ⟵ {filterDateTo || 'الآن'}
              <button
                type="button"
                onClick={() => {
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setDateRangePreset('all');
                }}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Multi-Selection & Send to Parent Communications Center Bar */}
        {displayViolations.length > 0 && onSendViolationsToMessages && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-teal-50/70 border border-teal-200">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-2 font-bold text-[#0C2340] cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    displayViolations.length > 0 &&
                    displayViolations.every((v) => selectedViolationIdsForMsg.includes(v.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedViolationIdsForMsg(displayViolations.map((v) => v.id));
                    } else {
                      setSelectedViolationIdsForMsg([]);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-[#006D77] focus:ring-[#006D77]"
                />
                <span>تحديد الكل للمراسلة ({displayViolations.length})</span>
              </label>
              {selectedViolationIdsForMsg.length > 0 && (
                <>
                  <span className="text-teal-800 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-teal-200">
                    تم تحديد {selectedViolationIdsForMsg.length} مخالفة
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedViolationIdsForMsg([])}
                    className="text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              disabled={selectedViolationIdsForMsg.length === 0}
              onClick={() => handleSendSelectedToMessages(selectedViolationIdsForMsg)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                إرسال إشعارات واتساب للمخالفات المحددة ({selectedViolationIdsForMsg.length})
              </span>
            </button>
          </div>
        )}

        {/* Display Violations: Table or Cards View */}
        {displayViolations.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            لا توجد مخالفات مسجلة تطابق معايير البحث والتصفية المحددة
          </div>
        ) : viewMode === 'table' ? (
          /* Structured Comprehensive Table View */
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          displayViolations.length > 0 &&
                          displayViolations.every((v) => selectedViolationIdsForMsg.includes(v.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedViolationIdsForMsg(displayViolations.map((v) => v.id));
                          } else {
                            setSelectedViolationIdsForMsg([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#006D77] focus:ring-[#006D77]"
                      />
                    </th>
                    <th className="p-3 font-bold">التاريخ والوقت</th>
                    <th className="p-3 font-bold">الرقم الطلابي</th>
                    <th className="p-3 font-bold">اسم الطالب</th>
                    <th className="p-3 font-bold">الصف والشعبة</th>
                    <th className="p-3 font-bold">نوع المخالفة</th>
                    <th className="p-3 font-bold">الدرجة</th>
                    <th className="p-3 font-bold">الحالة</th>
                    <th className="p-3 font-bold">الإجراء المقترح</th>
                    <th className="p-3 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayViolations.map((v) => {
                    const isLinked = isRecordReliablyLinked(v);
                    const isChecked = selectedViolationIdsForMsg.includes(v.id);
                    return (
                      <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-teal-50/40' : ''}`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectViolationForMsg(v.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#006D77] focus:ring-[#006D77]"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap text-xs">
                          {v.incidentDateTime}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {isLinked ? (
                            <span className="font-bold text-slate-800">{v.studentNumber}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                              مراجعة يدوية
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {isLinked ? (
                            <button
                              type="button"
                              onClick={() => onOpenStudentProfile(v.studentId || v.studentNumber)}
                              className="hover:text-[#006D77] transition-colors cursor-pointer text-right inline-flex items-center gap-1.5"
                              title="عرض ملف الطالب الشامل"
                            >
                              <span>{v.studentName}</span>
                              <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-semibold">
                                ملف الطالب
                              </span>
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-slate-700">{v.studentName}</span>
                              {!isViewer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViolationToLink(v);
                                    setLinkStudentSearch(v.studentName || '');
                                  }}
                                  className="text-[10px] font-bold text-[#006D77] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                  title="ربط برقم طالب موثوق من القائمة"
                                >
                                  ربط برقم طالب
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          الصف {v.grade}/{v.section}
                        </td>
                        <td className="p-3 font-medium text-slate-800 max-w-xs">
                          <span className="block truncate" title={v.violationType}>
                            {v.violationType}
                          </span>
                          {v.isMultiViolationIncident && v.violationsList && v.violationsList.length > 1 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#006D77] font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 w-fit mt-1">
                              <Layers className="w-3 h-3 text-[#D4AF37]" />
                              {v.violationsList.length} مخالفات مجمعة
                            </span>
                          )}
                          {(() => {
                            const cInfo = getCommitteeCasesByViolationId(v.id);
                            if (cInfo.length === 0) return null;
                            const m = cInfo[0].meeting;
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#006D77] font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 w-fit mt-1 mr-1">
                                <Users className="w-3 h-3 text-[#D4AF37]" />
                                جلسة لجنة السلوك: {m.sessionNumber || m.meetingNumber}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-bold whitespace-nowrap ${getDegreeBadge(
                                v.violationDegree
                              )}`}
                            >
                              {v.violationDegree}
                            </span>
                            {v.totalDeductionMarks !== undefined && v.totalDeductionMarks > 0 && (
                              <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                                حسم {v.totalDeductionMarks} درجات
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={v.status}
                            disabled={isViewer}
                            onChange={(e) =>
                              handleQuickStatusChange(v, e.target.value as ViolationStatus)
                            }
                            className={`text-xs font-bold py-1 px-2 rounded-md border ${
                              isViewer ? 'opacity-80 cursor-not-allowed' : ''
                            } ${getStatusBadge(v.status)}`}
                          >
                            <option value="مسودة">مسودة</option>
                            <option value="تم التنبيه">تم التنبيه</option>
                            <option value="تم توقيع الطالب">تم توقيع الطالب</option>
                            <option value="تم توقيع ولي الأمر">تم توقيع ولي الأمر</option>
                            <option value="تم الحفظ في ملف الطالب">تم الحفظ في ملف الطالب</option>
                            <option value="تم رفعها على موقع الوزارة">تم رفعها على موقع الوزارة</option>
                            <option value="مغلقة">مغلقة</option>
                          </select>
                        </td>
                        <td className="p-3 text-xs text-slate-600 max-w-xs">
                          <span className="block truncate" title={v.suggestedAction}>
                            {v.suggestedAction || 'غير محدد'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onOpenViolationReportForStudent && (
                              <button
                                type="button"
                                onClick={() => onOpenViolationReportForStudent(v.studentId, v.id)}
                                className="px-2 py-1 text-xs text-[#006D77] hover:text-[#0C2340] bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors font-bold cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                                title="إنشاء حزمة النماذج الرسمية أو إضافة نموذج آخر لهذه الواقعة"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>+ إضافة نموذج رسمي</span>
                              </button>
                            )}
                            {onSendViolationsToMessages && isLinked && (
                              <button
                                type="button"
                                onClick={() => handleSendSelectedToMessages([v.id])}
                                className="px-2 py-1 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors font-bold cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                                title="إرسال إشعار واتساب لولي الأمر بهذه المخالفة"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>واتساب</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenStudentProfile(v.studentId || v.studentNumber)}
                              className="p-1.5 text-slate-400 hover:text-[#006D77] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="عرض ملف وسجل الطالب"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteViolation && !isViewer && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف مخالفة الطالب "${v.studentName}"؟ سيتم تحديث رصيد مخالفات الطالب تلقائيًا.`)) {
                                    onDeleteViolation(v.id, v.studentNumber, v.studentId);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف المخالفة وتحديث رصيد الطالب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="space-y-3">
            {displayViolations.map((v) => (
              <div
                key={v.id}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all space-y-3 shadow-2xs"
              >
                  {(() => {
                    const isLinked = isRecordReliablyLinked(v);
                    const isChecked = selectedViolationIdsForMsg.includes(v.id);
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectViolationForMsg(v.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#006D77] focus:ring-[#006D77] cursor-pointer"
                            title="تحديد المخالفة لإرسال إشعار لولي الأمر"
                          />
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-md border ${getDegreeBadge(
                              v.violationDegree
                            )}`}
                          >
                            {v.violationDegree}
                          </span>
                          {isLinked ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenStudentProfile(v.studentId || v.studentNumber)}
                                className="font-bold text-sm text-slate-900 hover:text-[#006D77] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <span>{v.studentName}</span>
                                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-semibold">
                                  ملف الطالب
                                </span>
                              </button>
                              <span className="text-xs text-slate-500 font-mono">
                                ({v.studentNumber} • الصف {v.grade}/{v.section})
                              </span>
                            </>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{v.studentName}</span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                مراجعة يدوية (بدون رقم طلابي)
                              </span>
                              {!isViewer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViolationToLink(v);
                                    setLinkStudentSearch(v.studentName || '');
                                  }}
                                  className="text-[10px] font-bold text-[#006D77] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                  ربط برقم طالب
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status updater */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400">الحالة:</span>
                            <select
                              value={v.status}
                              disabled={isViewer}
                              onChange={(e) =>
                                handleQuickStatusChange(v, e.target.value as ViolationStatus)
                              }
                              className={`text-xs font-bold py-1 px-2.5 rounded-md border ${
                                isViewer ? 'opacity-80 cursor-not-allowed' : ''
                              } ${getStatusBadge(v.status)}`}
                            >
                              <option value="مسودة">مسودة</option>
                              <option value="تم التنبيه">تم التنبيه</option>
                              <option value="تم توقيع الطالب">تم توقيع الطالب</option>
                              <option value="تم توقيع ولي الأمر">تم توقيع ولي الأمر</option>
                              <option value="تم الحفظ في ملف الطالب">تم الحفظ في ملف الطالب</option>
                              <option value="تم رفعها على موقع الوزارة">تم رفعها على موقع الوزارة</option>
                              <option value="مغلقة">مغلقة</option>
                            </select>
                          </div>

                          {onOpenViolationReportForStudent && (
                            <button
                              type="button"
                              onClick={() => onOpenViolationReportForStudent(v.studentId, v.id)}
                              className="px-2.5 py-1 text-xs text-[#006D77] hover:text-[#0C2340] bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1.5 transition-colors font-bold cursor-pointer shadow-2xs whitespace-nowrap"
                              title="إنشاء حزمة النماذج الرسمية أو إضافة نموذج رسمي آخر لهذه الواقعة"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>+ إضافة نموذج رسمي آخر</span>
                            </button>
                          )}

                          {onSendViolationsToMessages && isLinked && (
                            <button
                              type="button"
                              onClick={() => handleSendSelectedToMessages([v.id])}
                              className="px-2.5 py-1 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors font-bold cursor-pointer shadow-2xs whitespace-nowrap"
                              title="إرسال إشعار واتساب لولي الأمر بهذه المخالفة"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>إشعار واتساب</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile(v.studentId || v.studentNumber)}
                            className="p-1.5 text-slate-400 hover:text-[#006D77] transition-colors cursor-pointer"
                            title="عرض ملف وسجل الطالب"
                          >
                            <User className="w-4 h-4" />
                          </button>

                          {onDeleteViolation && !isViewer && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف مخالفة الطالب "${v.studentName}"؟ سيتم تحديث رصيد مخالفات الطالب تلقائيًا.`)) {
                                  onDeleteViolation(v.id, v.studentNumber, v.studentId);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="حذف المخالفة وتحديث رصيد الطالب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {/* Violation Content */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                      {v.violationType}
                    </h4>
                    {v.isMultiViolationIncident && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006D77] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
                        واقعة متعددة ({v.violationsList?.length || 'مجمعة'})
                      </span>
                    )}
                    {v.totalDeductionMarks !== undefined && v.totalDeductionMarks > 0 && (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        إجمالي الحسم: {v.totalDeductionMarks} درجات
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                    {v.incidentDescription}
                  </p>

                  {/* Multi-violation items breakdown if present */}
                  {v.violationsList && v.violationsList.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-bold text-slate-500">بنود الواقعة:</span>
                      {v.violationsList.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white text-slate-700 text-[11px] border border-slate-200 font-medium shadow-2xs"
                        >
                          <span className="font-mono font-bold text-[#006D77]">{item.code}</span>
                          <span className="max-w-[200px] truncate font-bold text-slate-800" title={item.title}>
                            {item.title}
                          </span>
                          {item.repetition && (
                            <span className="text-slate-400">({item.repetition})</span>
                          )}
                          {item.deductionMarks !== undefined && item.deductionMarks > 0 && (
                            <span className="text-rose-600 font-bold">-{item.deductionMarks}د</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked official documents display */}
                  {(() => {
                    const linked = (violationReports || []).filter((r) => r.violationId === v.id);
                    if (linked.length === 0) return null;
                    return (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap gap-2 items-center text-xs">
                        <span className="font-bold text-slate-500 text-[11px]">النماذج المنشأة للواقعة ({linked.length}):</span>
                        {linked.map((rep) => (
                          <span
                            key={rep.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 text-[#006D77] border border-teal-200 text-[11px] font-bold"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>نموذج (6) تقرير مخالفة</span>
                            <span className="text-slate-400 font-mono text-[10px]">#{rep.reportNumber || rep.id.slice(0, 8)}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Linked Behavior Committee Session & Decision for this violation */}
                  {(() => {
                    const committeeInfo = getCommitteeCasesByViolationId(v.id);
                    if (!committeeInfo || committeeInfo.length === 0) return null;
                    return (
                      <div className="mt-3 p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#006D77] flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>لجنة إدارة السلوك</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            عُرضت على اللجنة
                          </span>
                        </div>
                        {committeeInfo.map(({ meeting, caseItem }, cIdx) => (
                          <div key={cIdx} className="text-xs text-slate-700 space-y-1 pt-1.5 border-t border-teal-100">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span>
                                الجلسة: <strong className="font-mono text-slate-900">{meeting.sessionNumber || meeting.meetingNumber}</strong> ({meeting.meetingDate})
                              </span>
                              <span className="font-bold text-teal-800">
                                القرار: {caseItem.decisionCustomText || caseItem.decision}
                              </span>
                            </div>
                            {caseItem.resultingFormIds && caseItem.resultingFormIds.length > 0 && (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                                <FileText className="w-3 h-3 text-[#D4AF37]" />
                                <span>النماذج الصادرة: {caseItem.resultingFormIds.join('، ')} (نموذج 12 - قرار إيقاف مؤقت)</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {v.incidentDateTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {v.incidentLocation}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      المُبلغ: {v.reportingPerson}
                    </span>
                  </div>

                  <div className="font-semibold text-teal-900">
                    الإجراء: {v.suggestedAction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Manual Review and Student Linking */}
      {violationToLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    ربط السجل برقم طالب موثوق
                  </h3>
                  <p className="text-xs text-slate-500">
                    مراجعة يدوية: حدد الطالب المعتمد لمنع الربط بالتخمين
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViolationToLink(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Violation Details */}
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs space-y-1.5 text-amber-900">
              <div className="flex justify-between">
                <span className="text-amber-700">الاسم بالسجل:</span>
                <span className="font-bold">{violationToLink.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">المخالفة:</span>
                <span className="font-medium truncate max-w-[280px]">{violationToLink.violationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">التاريخ:</span>
                <span className="font-mono">{violationToLink.incidentDateTime}</span>
              </div>
            </div>

            {/* Search Input for Roster Students */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ابحث في قائمة طلاب المدرسة (بالاسم أو الرقم الطلابي):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={linkStudentSearch}
                  onChange={(e) => setLinkStudentSearch(e.target.value)}
                  placeholder="اكتب اسم الطالب أو رقمه الطلابي..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  autoFocus
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            {/* Matching Students List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {matchingStudentsForLinking.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  لا توجد نتائج مطابقة لبحثك في قائمة طلاب المدرسة
                </div>
              ) : (
                matchingStudentsForLinking.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-[#006D77] hover:bg-teal-50/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => handleConfirmLinkStudent(st)}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{st.fullName}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        الرقم: {st.studentNumber} • الصف {st.grade}/{st.section}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-[#006D77] text-white rounded-lg text-xs font-bold hover:bg-[#005a63] transition-colors shrink-0"
                    >
                      تأكيد الربط
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViolationToLink(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
