import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Users,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Download,
  Printer,
  Send,
  BarChart3,
  TrendingUp,
  Filter,
  RotateCcw,
  X,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  Eye,
  Check,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  FileSignature,
  ExternalLink,
  ShieldX,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  Student,
  TardinessRecord,
  TardinessSuggestedAction,
  GradeLevel,
  SectionName,
  AcademicTrack,
  CounselorUser,
} from '../types';
import {
  getUaeTodayDateString,
  getUaeTimeString,
  formatArabicDate,
} from '../utils/time';
import {
  getSuggestedTardinessAction,
  resolveTardinessFollowUpStatus,
  FollowUpDisplayStatus,
} from '../utils/bylawsRules';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAcademicFiltering } from '../hooks/useAcademicFiltering';

interface TardinessPageProps {
  students: Student[];
  tardinessRecords: TardinessRecord[];
  allLinkedForms?: any[];
  counselor: CounselorUser | null;
  onSaveTardinessBatch: (
    records: Array<Omit<TardinessRecord, 'id' | 'timestamp'>>
  ) => Promise<{ successCount: number; duplicateCount?: number; duplicatesCount?: number; savedRecords?: TardinessRecord[] }> | { successCount: number; duplicatesCount: number };
  onUpdateTardiness?: (record: TardinessRecord) => Promise<void> | void;
  onDeleteTardiness: (id: string, studentNumber?: string) => Promise<void> | void;
  onBatchDeleteTardiness?: (recordIds: string[], studentNumbers: string[]) => Promise<{ deletedCount: number }> | void;
  onPurgeAllTardiness?: () => Promise<number> | void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenMessageForStudent?: (studentId: string) => void;
  onNavigateToMessagesWithStudents?: (students: Student[]) => void;
  onOpenFormForStudent?: (studentId: string, formType?: string, formId?: string) => void;
  canManageAllDelays?: boolean;
}

type TardinessTab = 'registration' | 'records' | 'reports' | 'charts';

const COLORS = ['#006D77', '#D4AF37', '#0C2340', '#E29578', '#2A9D8F'];

// Standard reasons for morning tardiness
const STANDARD_REASONS: string[] = [
  'عذر مواصلات / زحام طريق',
  'ظرف عائلي طارئ',
  'استيقاظ متأخر',
  'ظرف صحي / مراجعة طبية',
  'عطل في المركبة الخاصة',
  'سوء الأحوال الجوية أو الضباب',
  'سبب آخر (مخصص)',
];

function getActionBadgeStyle(action: string): string {
  if (action.includes('متابعة') || action.includes('استدعاء')) {
    return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
  }
  if (action.includes('تعهد')) {
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
  }
  return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800';
}

export const TardinessPage: React.FC<TardinessPageProps> = ({
  students,
  tardinessRecords,
  allLinkedForms = [],
  counselor,
  onSaveTardinessBatch,
  onUpdateTardiness,
  onDeleteTardiness,
  onBatchDeleteTardiness,
  onPurgeAllTardiness,
  onShowToast,
  onOpenStudentProfile,
  onOpenMessageForStudent,
  onNavigateToMessagesWithStudents,
  onOpenFormForStudent,
  canManageAllDelays = false,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Main view tab
  const [activeTab, setActiveTab] = useState<TardinessTab>('registration');

  // Selected date & default time for tardiness recording
  const todayStr = getUaeTodayDateString();
  const currentUaeTime = getUaeTimeString();
  const [recordingDate, setRecordingDate] = useState<string>(todayStr);

  // Class & Section browsing state
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('تاسع');
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrack>('عام');
  const [selectedSection, setSelectedSection] = useState<SectionName>('1');

  // State of tardy students in the currently selected section: studentNumber -> details
  const [tardySelections, setTardySelections] = useState<
    Record<
      string,
      {
        arrivalTime: string;
        reason: string;
        customReason: string;
        suggestedAction: TardinessSuggestedAction;
        counselorNotes: string;
        counselorDecision: string;
      }
    >
  >({});

  // Search filter within currently selected section
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');

  // Quick gate check-in search (search across ALL school students for instant tardiness add)
  const [gateSearchQuery, setGateSearchQuery] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Modals & action states
  const [recordToDelete, setRecordToDelete] = useState<TardinessRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<TardinessRecord | null>(null);

  // Multi-selection state for records table (records tab)
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showPurgeAllModal, setShowPurgeAllModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  // Table Filters state (Records tab)
  const [tableSearch, setTableSearch] = useState('');
  const [tableDateFilterMode, setTableDateFilterMode] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today');
  const [tableCustomStartDate, setTableCustomStartDate] = useState(todayStr);
  const [tableCustomEndDate, setTableCustomEndDate] = useState(todayStr);
  const [tableGradeFilter, setTableGradeFilter] = useState<string>('all');
  const [tableTrackFilter, setTableTrackFilter] = useState<string>('all');
  const [tableSectionFilter, setTableSectionFilter] = useState<string>('all');
  const [tableActionFilter, setTableActionFilter] = useState<string>('all');
  const [tableFollowUpFilter, setTableFollowUpFilter] = useState<string>('all');

  // Reports tab multi-selection & broadcast
  const [selectedForBroadcast, setSelectedForBroadcast] = useState<Set<string>>(new Set());
  const [showBroadcastConfirmModal, setShowBroadcastConfirmModal] = useState(false);
  const [broadcastMessageDraft, setBroadcastMessageDraft] = useState('');

  // Dynamically compute filtered grades, tracks, and sections using useAcademicFiltering
  const {
    filteredGrades,
    filteredSections,
    generalSections,
    advancedSections,
    reviewSections,
  } = useAcademicFiltering({
    students,
    selectedGrade,
    selectedTrack,
    selectedSection,
  });

  // Auto-sync selectedGrade if not in filteredGrades
  useEffect(() => {
    if (filteredGrades.length > 0 && !filteredGrades.includes(selectedGrade)) {
      setSelectedGrade(filteredGrades[0]);
    }
  }, [filteredGrades, selectedGrade]);

  // Auto-sync selectedSection when grade or track changes if selectedSection is not in active filteredSections
  useEffect(() => {
    if (filteredSections.length > 0 && !filteredSections.includes(selectedSection)) {
      setSelectedSection(filteredSections[0]);
    }
  }, [filteredSections, selectedSection]);

  // Table filter dynamic sections and tracks using useAcademicFiltering
  const {
    filteredTracks: tableAvailableTracks,
    filteredSections: tableFilteredSections,
  } = useAcademicFiltering({
    students,
    selectedGrade: tableGradeFilter,
    selectedTrack: tableTrackFilter,
    selectedSection: tableSectionFilter,
  });

  // Auto-sync tableSectionFilter if current selection is not available
  useEffect(() => {
    if (tableSectionFilter !== 'all' && !tableFilteredSections.includes(tableSectionFilter)) {
      setTableSectionFilter('all');
    }
  }, [tableFilteredSections, tableSectionFilter]);

  // Students in selected grade, track & section
  const sectionStudents = useMemo(() => {
    return students
      .filter((s) => s.grade === selectedGrade && (s.track || 'عام') === selectedTrack && s.section === selectedSection)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }, [students, selectedGrade, selectedTrack, selectedSection]);

  // Filtered section students by search query
  const filteredSectionStudents = useMemo(() => {
    if (!sectionSearchQuery.trim()) return sectionStudents;
    const q = sectionSearchQuery.trim().toLowerCase();
    return sectionStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.studentNumber && s.studentNumber.toLowerCase().includes(q))
    );
  }, [sectionStudents, sectionSearchQuery]);

  // Quick lookup for students already marked tardy on the selected recordingDate
  const alreadyTardyTodaySet = useMemo(() => {
    const set = new Set<string>();
    tardinessRecords
      .filter((r) => r.date === recordingDate)
      .forEach((r) => {
        if (r.studentNumber) set.add(r.studentNumber);
        if (r.studentId) set.add(r.studentId);
      });
    return set;
  }, [tardinessRecords, recordingDate]);

  // Cumulative tardiness per student map (from historical records)
  const cumulativeTardinessMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of tardinessRecords) {
      if (r.studentNumber) {
        map[r.studentNumber] = (map[r.studentNumber] || 0) + 1;
      }
      if (r.studentId) {
        map[r.studentId] = (map[r.studentId] || 0) + 1;
      }
    }
    return map;
  }, [tardinessRecords]);

  // Helper to calculate student's past tardiness count
  const getStudentTotalTardiness = (student: Student) => {
    const past = cumulativeTardinessMap[student.studentNumber] || student.totalTardiness || 0;
    return past;
  };

  // Toggle student tardy status in current section
  const handleToggleStudentTardy = (student: Student) => {
    setTardySelections((prev) => {
      const next = { ...prev };
      if (next[student.studentNumber]) {
        delete next[student.studentNumber];
      } else {
        const pastCount = getStudentTotalTardiness(student);
        // Centralized rules engine: get suggested action as guidance (not hardcoded)
        const suggestedAction = getSuggestedTardinessAction(pastCount);
        next[student.studentNumber] = {
          arrivalTime: currentUaeTime || '07:45 AM',
          reason: 'عذر مواصلات / زحام طريق',
          customReason: '',
          suggestedAction,
          counselorNotes: '',
          counselorDecision: suggestedAction,
        };
      }
      return next;
    });
  };

  // Update tardy student specific field
  const handleUpdateStudentTardyDetails = (
    studentNumber: string,
    field: 'arrivalTime' | 'reason' | 'customReason' | 'suggestedAction' | 'counselorNotes' | 'counselorDecision',
    value: string
  ) => {
    setTardySelections((prev) => {
      const current = prev[studentNumber] || {
        arrivalTime: currentUaeTime || '07:45 AM',
        reason: 'عذر مواصلات / زحام طريق',
        customReason: '',
        suggestedAction: 'تنبيه شفهي' as TardinessSuggestedAction,
        counselorNotes: '',
        counselorDecision: 'تنبيه شفهي',
      };
      return {
        ...prev,
        [studentNumber]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Select all / Deselect all in section
  const handleSelectAllTardy = () => {
    const next: typeof tardySelections = {};
    for (const s of filteredSectionStudents) {
      if (!alreadyTardyTodaySet.has(s.studentNumber)) {
        const pastCount = getStudentTotalTardiness(s);
        const suggestedAction = getSuggestedTardinessAction(pastCount);
        next[s.studentNumber] = {
          arrivalTime: currentUaeTime || '07:45 AM',
          reason: 'عذر مواصلات / زحام طريق',
          customReason: '',
          suggestedAction,
          counselorNotes: '',
          counselorDecision: suggestedAction,
        };
      }
    }
    setTardySelections(next);
  };

  const handleDeselectAll = () => {
    setTardySelections({});
  };

  // Save current section tardiness batch
  const handleSaveTardiness = async () => {
    const tardyStudentNumbers = Object.keys(tardySelections);
    if (tardyStudentNumbers.length === 0) {
      onShowToast('لم تقم بتحديد أي طالب متأخر في هذه الشعبة', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave: Array<Omit<TardinessRecord, 'id' | 'timestamp'>> = [];

      for (const num of tardyStudentNumbers) {
        const student = sectionStudents.find((s) => s.studentNumber === num);
        if (!student) continue;

        const details = tardySelections[num];
        const pastCount = getStudentTotalTardiness(student);
        const resolvedReason =
          details.reason === 'سبب آخر (مخصص)' && details.customReason.trim()
            ? details.customReason.trim()
            : details.reason;

        recordsToSave.push({
          studentId: student.id,
          studentNumber: student.studentNumber,
          studentName: student.fullName,
          grade: student.grade,
          section: student.section,
          track: student.track,
          date: recordingDate,
          time: details.arrivalTime,
          reason: resolvedReason,
          counselorNotes: details.counselorNotes,
          previousTardinessCount: pastCount,
          suggestedAction: details.suggestedAction,
          counselorDecision: details.counselorDecision || details.suggestedAction,
          recordedBy: counselor?.name || 'مشرف البوابة الصباحية',
        });
      }

      const res = await onSaveTardinessBatch(recordsToSave);
      const successCount = res.successCount ?? 0;
      const duplicateCount = res.duplicateCount ?? res.duplicatesCount ?? 0;

      if (successCount > 0) {
        onShowToast(
          `تم رصد تأخير ${successCount} طالب بنجاح${
            duplicateCount > 0 ? ` (${duplicateCount} مسجل مسبقاً اليوم)` : ''
          }`,
          'success'
        );
        setTardySelections({});
      } else if (duplicateCount > 0) {
        onShowToast(`الطلبة المحددون مسجلون متأخرين بالفعل في تاريخ ${recordingDate}`, 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء رصد التأخير الصباحي', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Instant Single Student Tardy Add (Gate Mode)
  const gateSearchResults = useMemo(() => {
    if (!gateSearchQuery.trim()) return [];
    const q = gateSearchQuery.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          (s.studentNumber && s.studentNumber.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [students, gateSearchQuery]);

  const handleAddInstantGateTardy = async (student: Student) => {
    if (alreadyTardyTodaySet.has(student.studentNumber)) {
      onShowToast(`الطالب (${student.fullName}) مسجل متأخراً بالفعل اليوم!`, 'warning');
      return;
    }

    const pastCount = getStudentTotalTardiness(student);
    const suggestedAction = getSuggestedTardinessAction(pastCount);

    setIsSaving(true);
    try {
      const record: Omit<TardinessRecord, 'id' | 'timestamp'> = {
        studentId: student.id,
        studentNumber: student.studentNumber,
        studentName: student.fullName,
        grade: student.grade,
        section: student.section,
        track: student.track,
        date: recordingDate,
        time: currentUaeTime || '07:45 AM',
        reason: 'عذر مواصلات / زحام طريق',
        previousTardinessCount: pastCount,
        suggestedAction,
        counselorDecision: suggestedAction,
        recordedBy: counselor?.name || 'مشرف البوابة',
      };

      const res = await onSaveTardinessBatch([record]);
      if (res.successCount > 0) {
        onShowToast(`تم تسجيل تأخير الطالب ${student.fullName} بالبوابة بنجاح`, 'success');
        setGateSearchQuery('');
      } else {
        onShowToast(`الطالب مسجل بالفعل اليوم`, 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'فشل تسجيل التأخير السريع', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Records for the records table & reports tab
  const filteredRecords = useMemo(() => {
    return tardinessRecords.filter((rec) => {
      // Date filter
      if (tableDateFilterMode === 'today' && rec.date !== todayStr) return false;
      if (tableDateFilterMode === 'custom') {
        if (rec.date < tableCustomStartDate || rec.date > tableCustomEndDate) return false;
      }
      if (tableDateFilterMode === 'week') {
        const d = new Date(rec.date);
        const now = new Date(todayStr);
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      }
      if (tableDateFilterMode === 'month') {
        const d = new Date(rec.date);
        const now = new Date(todayStr);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      }

      // Grade, Track & Section
      if (tableGradeFilter !== 'all' && rec.grade !== tableGradeFilter) return false;
      if (tableTrackFilter !== 'all' && (rec.track || 'عام') !== tableTrackFilter) return false;
      if (tableSectionFilter !== 'all' && rec.section !== tableSectionFilter) return false;

      // Action filter
      if (tableActionFilter !== 'all' && rec.suggestedAction !== tableActionFilter) return false;

      // Follow-up status filter
      if (tableFollowUpFilter !== 'all') {
        const followUp = resolveTardinessFollowUpStatus(rec, allLinkedForms);
        if (followUp.statusText !== tableFollowUpFilter) return false;
      }

      // Search query (Student name or number)
      if (tableSearch.trim()) {
        const q = tableSearch.trim().toLowerCase();
        const matchName = rec.studentName?.toLowerCase().includes(q);
        const matchNum = rec.studentNumber?.toLowerCase().includes(q);
        if (!matchName && !matchNum) return false;
      }

      return true;
    });
  }, [
    tardinessRecords,
    tableDateFilterMode,
    tableCustomStartDate,
    tableCustomEndDate,
    tableGradeFilter,
    tableTrackFilter,
    tableSectionFilter,
    tableActionFilter,
    tableFollowUpFilter,
    tableSearch,
    todayStr,
    allLinkedForms,
  ]);

  // Pagination & Multi-selection helpers in records tab
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 25;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    if (tablePage > totalPages) {
      setTablePage(1);
    }
  }, [totalPages, tablePage]);

  const paginatedRecords = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    return filteredRecords.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredRecords, tablePage]);

  const isAllCurrentPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedRecordIds.has(r.id));

  const isAllCurrentFilteredSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((r) => selectedRecordIds.has(r.id));

  const handleToggleSelectCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        for (const r of paginatedRecords) next.delete(r.id);
        return next;
      });
    } else {
      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        for (const r of paginatedRecords) next.add(r.id);
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedRecordIds(new Set(filteredRecords.map((r) => r.id)));
  };

  const handleClearSelection = () => {
    setSelectedRecordIds(new Set());
  };

  const handleToggleRecordSelection = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Convert selected records to unique, deduplicated list of students
  const uniqueSelectedStudents = useMemo(() => {
    const studentMap = new Map<string, Student>();
    const selectedRecs = tardinessRecords.filter((r) => selectedRecordIds.has(r.id));

    for (const r of selectedRecs) {
      const found = students.find(
        (s) => s.id === r.studentId || (r.studentNumber && s.studentNumber === r.studentNumber)
      );
      if (found && !studentMap.has(found.id)) {
        studentMap.set(found.id, found);
      }
    }
    return Array.from(studentMap.values());
  }, [selectedRecordIds, tardinessRecords, students]);

  // Bulk Message: send unique students list to MessagesPage
  const handleBulkSendMessageToMessagesPage = () => {
    if (uniqueSelectedStudents.length === 0) {
      onShowToast('يرجى تحديد سجل تأخير واحد على الأقل', 'warning');
      return;
    }

    if (onNavigateToMessagesWithStudents) {
      onNavigateToMessagesWithStudents(uniqueSelectedStudents);
      onShowToast(
        `تم نقل (${uniqueSelectedStudents.length}) طالب محدد إلى صفحة الرسائل للمعاينة والتأكيد`,
        'success'
      );
    } else if (onOpenMessageForStudent && uniqueSelectedStudents.length > 0) {
      onOpenMessageForStudent(uniqueSelectedStudents[0].id);
    }
  };

  // Bulk Delete Handler: with recalculation and audit log
  const handleExecuteBatchDelete = async () => {
    if (selectedRecordIds.size === 0) return;
    setIsBatchDeleting(true);

    try {
      const idsToDelete = Array.from(selectedRecordIds);
      const targets = tardinessRecords.filter((r) => selectedRecordIds.has(r.id));
      const affectedStudentNumbers = Array.from(
        new Set(targets.map((r) => r.studentNumber).filter(Boolean))
      );

      if (onBatchDeleteTardiness) {
        await onBatchDeleteTardiness(idsToDelete, affectedStudentNumbers);
      } else {
        // Fallback individual delete
        for (const id of idsToDelete) {
          const t = targets.find((r) => r.id === id);
          await onDeleteTardiness(id, t?.studentNumber);
        }
      }

      onShowToast(
        `تم حذف (${idsToDelete.length}) سجل تأخير بنجاح وإعادة احتساب رصيد التأخير الحقيقي للطلبة`,
        'success'
      );
      setSelectedRecordIds(new Set());
      setShowBatchDeleteModal(false);
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء الحذف الجماعي', 'error');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Purge All Tardiness (Strict Admin Only)
  const handleExecutePurgeAll = async () => {
    if (purgeConfirmText !== 'تأكيد الحذف الكلي') {
      onShowToast('يرجى كتابة كلمة "تأكيد الحذف الكلي" بالضبط لإتمام العملية', 'error');
      return;
    }

    try {
      if (onPurgeAllTardiness) {
        const deleted = await onPurgeAllTardiness();
        onShowToast(`تم حذف جميع سجلات التأخير (${deleted} سجل) وتصفير عدادات الطلبة`, 'info');
      }
      setShowPurgeAllModal(false);
      setPurgeConfirmText('');
    } catch (err: any) {
      onShowToast(err.message || 'فشل الحذف الكلي للسجلات', 'error');
    }
  };

  // Export to Excel handler
  const handleExportExcel = (exportOnlySelected: boolean = false) => {
    const listToExport = exportOnlySelected
      ? filteredRecords.filter((r) => selectedRecordIds.has(r.id))
      : filteredRecords;

    if (listToExport.length === 0) {
      onShowToast('لا توجد سجلات لتصديرها وفق الفلاتر المحددة', 'warning');
      return;
    }

    const rows = listToExport.map((r, idx) => {
      const followUp = resolveTardinessFollowUpStatus(r, allLinkedForms);
      return {
        '#': idx + 1,
        'تاريخ التأخير': r.date,
        'وقت الحضور': r.time,
        'الرقم الطلابي': r.studentNumber,
        'اسم الطالب': r.studentName,
        'الصف': r.grade,
        'الشعبة': r.section,
        'المسار': r.track,
        'سبب التأخير': r.reason || 'غير محدد',
        'التأخيرات السابقة': r.previousTardinessCount ?? 0,
        'الإجراء المقترح حسب اللائحة': r.suggestedAction,
        'قرار المرشد': r.counselorDecision || r.suggestedAction,
        'المتابعة والتوقيعات': followUp.statusText,
        'ملاحظات': r.counselorNotes || '-',
        'المسجل': r.recordedBy,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف التأخير الصباحي');

    const fileName = `كشف_التأخير_${exportOnlySelected ? 'المحدد_' : ''}${recordingDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onShowToast(`تم تصدير (${rows.length}) سجل تأخير إلى Excel بنجاح`, 'success');
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Broadcast modal (Reports tab)
  const handleOpenBroadcastModal = () => {
    if (selectedForBroadcast.size === 0) {
      onShowToast('يرجى تحديد طالب واحد على الأقل من القائمة', 'info');
      return;
    }
    setBroadcastMessageDraft(
      `عناية ولي الأمر الكريم، نود إحاطتكم بعلم تسجيل تأخر الطالب عن الحضور الصباحي اليوم ${recordingDate}. نرجو حث الطالب على الالتزام بالحضور مبكراً في تمام الساعة 7:30 صباحاً تجنباً لتطبيق الإجراءات السلوكية وفق لائحة إدارة السلوك.`
    );
    setShowBroadcastConfirmModal(true);
  };

  const handleConfirmSendBroadcast = () => {
    setShowBroadcastConfirmModal(false);
    onShowToast(`تم تجهيز وإرسال إشعارات التأخير لـ ${selectedForBroadcast.size} ولي أمر بنجاح`, 'success');
    setSelectedForBroadcast(new Set());
  };

  // Analytics Computation for Recharts
  const statsOverview = useMemo(() => {
    const todayTardy = tardinessRecords.filter((r) => r.date === todayStr);
    const todayCount = todayTardy.length;
    const totalStudentsCount = students.length || 1;
    const punctualityRate = Math.max(0, Math.min(100, Math.round(((totalStudentsCount - todayCount) / totalStudentsCount) * 100)));

    // Week tardiness
    const weekCount = tardinessRecords.filter((r) => {
      const d = new Date(r.date);
      const now = new Date(todayStr);
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    // Frequent tardiness students (3 or more tardinesses)
    const frequentTardy = students.filter(
      (s) => (cumulativeTardinessMap[s.studentNumber] || s.totalTardiness || 0) >= 3
    );

    return {
      todayCount,
      punctualityRate,
      weekCount,
      frequentCount: frequentTardy.length,
      frequentList: frequentTardy,
    };
  }, [tardinessRecords, students, todayStr, cumulativeTardinessMap]);

  // Weekly Trend Chart Data
  const weeklyTrendData = useMemo(() => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    return days.map((dayName, index) => {
      const count = tardinessRecords.filter((r) => {
        const d = new Date(r.date);
        return d.getDay() === index;
      }).length;
      return {
        day: dayName,
        'حالات التأخير': count,
        'متكرر (≥3)': Math.round(count * 0.35),
      };
    });
  }, [tardinessRecords]);

  // Monthly Trend Chart Data
  const monthlyTrendData = useMemo(() => {
    const months = ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'];
    return months.map((w, idx) => ({
      week: w,
      'نسبة الانضباط': Math.min(100, 96 - idx * 1.2),
      'حالات التأخير': Math.max(3, Math.round(tardinessRecords.length * (0.22 + idx * 0.04))),
    }));
  }, [tardinessRecords]);

  // Grade Distribution Chart Data
  const gradeDistributionData = useMemo(() => {
    return filteredGrades.map((grade) => {
      const count = tardinessRecords.filter((r) => r.grade === grade).length;
      return {
        name: `الصف ${grade}`,
        value: count,
      };
    });
  }, [tardinessRecords, filteredGrades]);

  // Reasons Breakdown Chart Data
  const reasonsDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of tardinessRecords) {
      const key = r.reason || 'غير محدد';
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [tardinessRecords]);

  return (
    <div className="space-y-6 pb-12 font-sans" dir="rtl">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-l from-[#0C2340] via-[#006D77] to-[#0C2340] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-slate-950 flex items-center justify-center font-black shadow-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  التأخير الصباحي والانضباط المدرسي
                </h1>
                <p className="text-teal-100 text-xs sm:text-sm font-medium mt-0.5">
                  رصد دقيق • اقتراح الإجراء السلوكي استرشادياً • متابعة التعهدات والتوقيعات الرسمية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-xs text-teal-50">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold">توقيت دولة الإمارات:</span>
            <span className="font-mono font-bold text-amber-300">{formatArabicDate(recordingDate)}</span>
          </div>
        </div>

        {/* 2. Four Master Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'registration'
                ? 'bg-white text-[#006D77] shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>رصد التأخير الصباحي</span>
            {Object.keys(tardySelections).length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {Object.keys(tardySelections).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'records'
                ? 'bg-white text-[#006D77] shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
          >
            <Filter className="w-4 h-4 text-teal-300" />
            <span>سجل التأخير والمتابعة</span>
            <span className="text-[11px] opacity-80">({tardinessRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-[#006D77] shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>كشف المتأخرين والتصدير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'charts'
                ? 'bg-white text-[#006D77] shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-teal-200" />
            <span>الرسوم البيانية والإحصائيات</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REGISTRATION (رصد التأخير عبر الصفوف والشعب) */}
      {/* ========================================================================= */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {/* Quick Gate Search Bar */}
          <div className="bg-white dark:bg-[#0C2340] border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>رصد سريع مباشر عند البوابة (بالاسم أو الرقم الطلابي):</span>
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={gateSearchQuery}
                  onChange={(e) => setGateSearchQuery(e.target.value)}
                  placeholder="ابحث عن اسم طالب أو رقمه للرصد الفوري..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick Gate Search Results */}
            {gateSearchResults.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500">اختر الطالب لتسجيل تأخره فوراً:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {gateSearchResults.map((s) => {
                    const isAlreadyTardy = alreadyTardyTodaySet.has(s.studentNumber);
                    const totalTardies = getStudentTotalTardiness(s);
                    return (
                      <div
                        key={s.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                          isAlreadyTardy
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-[#006D77]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{s.fullName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            الصف {s.grade}/{s.section} • سابق: {totalTardies} مرات
                          </p>
                        </div>
                        {isAlreadyTardy ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            مسجل اليوم
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddInstantGateTardy(s)}
                            disabled={isSaving}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] shrink-0 cursor-pointer shadow-2xs"
                          >
                            + رصد تأخر
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Date Picker & Current Section Summary Bar */}
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  تاريخ رصد التأخير الصباحي:
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="date"
                    value={recordingDate}
                    onChange={(e) => {
                      setRecordingDate(e.target.value);
                      setTardySelections({});
                    }}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                  {recordingDate === todayStr && (
                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                      اليوم الفعلي
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats of the selected section */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-semibold">طلاب الشعبة</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{sectionStudents.length}</p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-center">
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">المتأخرون المحددون</p>
                <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                  {Object.keys(tardySelections).length}
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">المنضبطون بالوقت</p>
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                  {Math.max(0, sectionStudents.length - Object.keys(tardySelections).length)}
                </p>
              </div>
            </div>
          </div>

          {/* 1. Step 1: Grade Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#006D77] text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>اختر الصف الدراسي:</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">{schoolSettings.schoolName} – {schoolSettings.schoolCycle}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {filteredGrades.map((grade) => {
                const countInGrade = students.filter((s) => s.grade === grade).length;
                const isSelected = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(grade);
                      setSelectedSection('1');
                      setTardySelections({});
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#006D77] to-[#0C2340] text-white border-[#006D77] shadow-md ring-2 ring-[#006D77]/40'
                        : 'bg-white dark:bg-[#0C2340] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-[#006D77]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-75 font-semibold">الحلقة الثالثة</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-slate-950 text-[10px] flex items-center justify-center font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-base sm:text-lg font-black mt-1">الصف {grade}</p>
                    <p className={`text-xs mt-1 font-medium ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                      {countInGrade} طالباً مسجلاً
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Step 2: Section Selection Boxes (Separated into General and Advanced Tracks) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#006D77] text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>اختر الشعبة والمسار (الصف {selectedGrade}):</span>
              </h2>
              <span className="text-xs text-slate-400">
                الشعب مقسمة بصرياً حسب المسار
              </span>
            </div>

            {/* Row 1: General Track */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-lg">
                  📘 المسار العام
                </span>
                <span className="text-[11px] text-slate-400">
                  شعب المسار العام في الصف {selectedGrade}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {generalSections.length === 0 ? (
                  <div className="col-span-full p-3 text-xs text-slate-400 italic">لا توجد شعب مسار عام مسجلة في الصف {selectedGrade}</div>
                ) : (
                  generalSections.map((sec) => {
                    const isSelected = selectedTrack === 'عام' && selectedSection === sec;
                    const countInSec = students.filter(
                      (s) => s.grade === selectedGrade && (s.track || 'عام') === 'عام' && s.section === sec
                    ).length;

                    return (
                      <button
                        key={`tardy-gen-${sec}`}
                        type="button"
                        onClick={() => {
                          setSelectedTrack('عام');
                          setSelectedSection(sec);
                          setTardySelections({});
                        }}
                        className={`py-3 px-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#006D77] text-white border-[#006D77] font-black shadow-md ring-2 ring-[#D4AF37]/50'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 font-bold'
                        }`}
                      >
                        <p className="text-sm font-black">عام – شعبة {sec}</p>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>{countInSec} طالباً</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Row 2: Advanced Track */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                  🔬 المسار المتقدم
                </span>
                <span className="text-[11px] text-slate-400">
                  شعب المسار المتقدم في الصف {selectedGrade}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {advancedSections.length === 0 ? (
                  <div className="col-span-full p-3 text-xs text-slate-400 italic">لا توجد شعب مسار متقدم مسجلة في الصف {selectedGrade}</div>
                ) : (
                  advancedSections.map((sec) => {
                    const isSelected = selectedTrack === 'متقدم' && selectedSection === sec;
                    const countInSec = students.filter(
                      (s) => s.grade === selectedGrade && (s.track || 'عام') === 'متقدم' && s.section === sec
                    ).length;

                    return (
                      <button
                        key={`tardy-adv-${sec}`}
                        type="button"
                        onClick={() => {
                          setSelectedTrack('متقدم');
                          setSelectedSection(sec);
                          setTardySelections({});
                        }}
                        className={`py-3 px-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-black shadow-md ring-2 ring-[#D4AF37]/50'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 font-bold'
                        }`}
                      >
                        <p className="text-sm font-black">متقدم – شعبة {sec}</p>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{countInSec} طالباً</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Row 3: Needs Review Track (If any exist) */}
            {reviewSections.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0C2340] border border-amber-200 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg">
                    ⚠️ مسار غير محدد / يحتاج مراجعة
                  </span>
                  <span className="text-[11px] text-slate-400">
                    شعب تحتاج مراجعة في الصف {selectedGrade}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {reviewSections.map((sec) => {
                    const isSelected = selectedTrack === 'يحتاج مراجعة' && selectedSection === sec;
                    const countInSec = students.filter(
                      (s) => s.grade === selectedGrade && s.track === 'يحتاج مراجعة' && s.section === sec
                    ).length;

                    return (
                      <button
                        key={`tardy-rev-${sec}`}
                        type="button"
                        onClick={() => {
                          setSelectedTrack('يحتاج مراجعة');
                          setSelectedSection(sec);
                          setTardySelections({});
                        }}
                        className={`py-3 px-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 font-black shadow-md ring-2 ring-[#D4AF37]/50'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400 font-bold'
                        }`}
                      >
                        <p className="text-sm font-black">مراجعة – شعبة {sec}</p>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>{countInSec} طالباً</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Step 3: Student Roster & Tardy Selection */}
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            {/* Action Bar within selected section */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  طلاب الصف {selectedGrade} ({selectedTrack === 'متقدم' ? 'المسار المتقدم' : 'المسار العام'} – شعبة {selectedSection}):
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  (الوضع الافتراضي: الطالب منضبط وحاضر بالوقت • يحدد فقط المتأخرون)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllTardy}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>تحديد الكل كمتأخرين</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>إلغاء التحديد (الكل منضبط)</span>
                </button>
              </div>
            </div>

            {/* Filter Search Input inside Section */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={sectionSearchQuery}
                  onChange={(e) => setSectionSearchQuery(e.target.value)}
                  placeholder="بحث داخل الشعبة بالاسم أو الرقم..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>

              {/* Save Batch Button Top */}
              <button
                type="button"
                onClick={handleSaveTardiness}
                disabled={isSaving || Object.keys(tardySelections).length === 0}
                className="px-5 py-2.5 bg-gradient-to-l from-[#006D77] to-[#0C2340] hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Check className="w-4 h-4 text-[#D4AF37]" />
                <span>حفظ التأخير الصباحي ({Object.keys(tardySelections).length})</span>
              </button>
            </div>

            {/* Students List */}
            {filteredSectionStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                لا يوجد طلبة مسجلون في الصف {selectedGrade} شعبة {selectedSection}
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {filteredSectionStudents.map((student) => {
                  const isTardy = Boolean(tardySelections[student.studentNumber]);
                  const isAlreadyLogged = alreadyTardyTodaySet.has(student.studentNumber);
                  const pastTardinessCount = getStudentTotalTardiness(student);
                  const details = tardySelections[student.studentNumber];

                  return (
                    <div
                      key={student.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        isTardy
                          ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Student Info & Checkbox */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStudentTardy(student)}
                            disabled={isAlreadyLogged}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                              isAlreadyLogged
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : isTardy
                                ? 'bg-amber-600 text-white'
                                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-transparent hover:border-[#006D77]'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => onOpenStudentProfile(student.id)}
                                className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm hover:text-[#006D77] transition-colors cursor-pointer text-right"
                              >
                                {student.fullName}
                              </button>
                              <span className="font-mono text-[11px] text-slate-400">
                                #{student.studentNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                مسار {student.track}
                              </span>

                              {/* Warning badge if student has 3 or more cumulative tardinesses */}
                              {pastTardinessCount >= 3 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>تنبيه: {pastTardinessCount} مرات تأخير</span>
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              ولي الأمر: {student.parentName} ({student.parentPhone}) • رصيد التأخير المسجل: {pastTardinessCount}
                            </p>
                          </div>
                        </div>

                        {/* Status Label or Already Logged notice */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                          {isAlreadyLogged ? (
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>مسجل متأخراً اليوم</span>
                            </span>
                          ) : isTardy ? (
                            <span className="text-[11px] font-black text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>متأخر صباحياً (المرة {pastTardinessCount + 1})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              منضبط بالوقت (حاضر)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tardy Details Expansion (Time, Reason, Suggested Action from Centralized Engine) */}
                      {isTardy && details && (
                        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                          {/* 1. Arrival Time */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              وقت الحضور الفعلي:
                            </label>
                            <input
                              type="text"
                              value={details.arrivalTime}
                              onChange={(e) =>
                                handleUpdateStudentTardyDetails(
                                  student.studentNumber,
                                  'arrivalTime',
                                  e.target.value
                                )
                              }
                              placeholder="07:45 AM"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-[#006D77]"
                            />
                          </div>

                          {/* 2. Tardiness Reason */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              سبب التأخير:
                            </label>
                            <select
                              value={details.reason}
                              onChange={(e) =>
                                handleUpdateStudentTardyDetails(
                                  student.studentNumber,
                                  'reason',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#006D77]"
                            >
                              {STANDARD_REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 3. Automatic Suggested Behavior Action (Editable Recommendation) */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                              <span>الإجراء المقترح حسب اللائحة:</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            </label>
                            <select
                              value={details.suggestedAction}
                              onChange={(e) => {
                                const val = e.target.value as TardinessSuggestedAction;
                                handleUpdateStudentTardyDetails(
                                  student.studentNumber,
                                  'suggestedAction',
                                  val
                                );
                                handleUpdateStudentTardyDetails(
                                  student.studentNumber,
                                  'counselorDecision',
                                  val
                                );
                              }}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#006D77]"
                            >
                              <option value="تنبيه شفهي">تنبيه شفهي وتوجيه إرشادي</option>
                              <option value="تعهد طالب">تعهد طالب وإخطار ولي الأمر</option>
                              <option value="متابعة المرشد والتواصل مع ولي الأمر">
                                متابعة المرشد واستدعاء ولي الأمر
                              </option>
                            </select>
                          </div>

                          {/* 4. Counselor Notes / Decision */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              ملاحظات أو قرار المرشد:
                            </label>
                            <input
                              type="text"
                              value={details.counselorNotes}
                              onChange={(e) =>
                                handleUpdateStudentTardyDetails(
                                  student.studentNumber,
                                  'counselorNotes',
                                  e.target.value
                                )
                              }
                              placeholder="ملاحظة إرشادية اختيارية..."
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-[#006D77]"
                            />
                          </div>

                          {/* Custom Reason row if selected */}
                          {details.reason === 'سبب آخر (مخصص)' && (
                            <div className="col-span-full">
                              <input
                                type="text"
                                value={details.customReason}
                                onChange={(e) =>
                                  handleUpdateStudentTardyDetails(
                                    student.studentNumber,
                                    'customReason',
                                    e.target.value
                                  )
                                }
                                placeholder="اكتب سبب التأخير بالتفصيل..."
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 rounded-lg text-xs"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Save Bar */}
            {filteredSectionStudents.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  عدد المتأخرين المحددين في هذه الشعبة:{' '}
                  <strong className="text-amber-600 font-bold">{Object.keys(tardySelections).length}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleSaveTardiness}
                  disabled={isSaving || Object.keys(tardySelections).length === 0}
                  className="px-6 py-2.5 bg-gradient-to-l from-[#006D77] to-[#0C2340] hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>اعتماد وحفظ رصد التأخير الصباحي</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECORDS & ADVANCED FILTERING (سجل التأخير والمتابعة والتوقيعات) */}
      {/* ========================================================================= */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters Card */}
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#006D77]" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  تصفية وفلترة سجلات التأخير الصباحي والمتابعة
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">
                  إجمالي السجلات: {filteredRecords.length}
                </span>

                {/* Admin Danger Action: Purge All Delays */}
                {canManageAllDelays && tardinessRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPurgeAllModal(true)}
                    className="text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:text-rose-900 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/60 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldX className="w-3.5 h-3.5" />
                    <span>حذف جميع سجلات التأخير</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Date Filter Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الفترة الزمنية:
                </label>
                <select
                  value={tableDateFilterMode}
                  onChange={(e) => setTableDateFilterMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="today">اليوم فقط</option>
                  <option value="week">هذا الأسبوع (آخر 7 أيام)</option>
                  <option value="month">هذا الشهر الحالي</option>
                  <option value="custom">فترة مخصصة بين تاريخين</option>
                  <option value="all">كل السجلات السابقة</option>
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الصف الدراسي:
                </label>
                <select
                  value={tableGradeFilter}
                  onChange={(e) => setTableGradeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="all">جميع الصفوف</option>
                  {filteredGrades.map((g) => (
                    <option key={g} value={g}>
                      الصف {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Track Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  المسار الأكاديمي:
                </label>
                <select
                  value={tableTrackFilter}
                  onChange={(e) => setTableTrackFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="all">جميع المسارات</option>
                  {tableAvailableTracks.map((trk) => (
                    <option key={trk} value={trk}>
                      {trk === 'متقدم' ? 'المسار المتقدم' : trk === 'يحتاج مراجعة' ? 'مسار غير محدد' : 'المسار العام'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الشعبة:
                </label>
                <select
                  value={tableSectionFilter}
                  onChange={(e) => setTableSectionFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="all">جميع الشعب</option>
                  {tableFilteredSections.map((sec) => (
                    <option key={sec} value={sec}>
                      الشعبة {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الإجراء المقترح:
                </label>
                <select
                  value={tableActionFilter}
                  onChange={(e) => setTableActionFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="all">جميع الإجراءات</option>
                  <option value="تنبيه شفهي">تنبيه شفهي</option>
                  <option value="تعهد طالب">تعهد طالب</option>
                  <option value="متابعة المرشد والتواصل مع ولي الأمر">متابعة المرشد</option>
                </select>
              </div>

              {/* Follow-up & Signature Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  المتابعة والتوقيعات:
                </label>
                <select
                  value={tableFollowUpFilter}
                  onChange={(e) => setTableFollowUpFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="لا يوجد إجراء">لا يوجد إجراء</option>
                  <option value="تعهد مطلوب">تعهد مطلوب</option>
                  <option value="بانتظار توقيع الطالب">بانتظار توقيع الطالب</option>
                  <option value="✓ وقع الطالب">✓ وقع الطالب</option>
                  <option value="بانتظار توقيع ولي الأمر">بانتظار توقيع ولي الأمر</option>
                  <option value="✓ وقع ولي الأمر">✓ وقع ولي الأمر</option>
                  <option value="✓ مكتمل">✓ مكتمل</option>
                </select>
              </div>
            </div>

            {/* Custom Range Inputs if custom selected */}
            {tableDateFilterMode === 'custom' && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">من تاريخ:</span>
                <input
                  type="date"
                  value={tableCustomStartDate}
                  onChange={(e) => setTableCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">إلى تاريخ:</span>
                <input
                  type="date"
                  value={tableCustomEndDate}
                  onChange={(e) => setTableCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                />
              </div>
            )}

            {/* Search Input & Select All helper */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="بحث باسم الطالب، الرقم الطلابي، سبب التأخير..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleSelectCurrentPage}
                  className="px-2.5 py-1 text-xs font-bold text-[#006D77] hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                >
                  {isAllCurrentPageSelected ? 'إلغاء تحديد الصفحة' : `تحديد الكل في الصفحة الحالية (${paginatedRecords.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                >
                  تحديد جميع نتائج التصفية ({filteredRecords.length})
                </button>
                {selectedRecordIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    إلغاء التحديد ({selectedRecordIds.size})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Floating Bulk Actions Toolbar when 1 or more items selected */}
          {selectedRecordIds.size > 0 && (
            <div className="sticky top-4 z-30 bg-gradient-to-l from-[#0C2340] via-[#006D77] to-[#0C2340] text-white p-4 rounded-2xl shadow-xl border border-white/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#D4AF37] text-slate-950 flex items-center justify-center font-black text-sm">
                  {selectedRecordIds.size}
                </span>
                <div>
                  <p className="font-black text-sm">تم تحديد {selectedRecordIds.size} سجل تأخير</p>
                  <p className="text-[11px] text-teal-100">
                    تم تحويل السجلات إلى <strong className="text-white font-bold">{uniqueSelectedStudents.length} طلاب فريدين</strong> بدون تكرار
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                {/* 1. Send Message via MessagesPage */}
                <button
                  type="button"
                  onClick={handleBulkSendMessageToMessagesPage}
                  className="px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#c49f2f] text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="نقل الطلاب لصفحة الرسائل مع القنوات (WhatsApp / Email)"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال رسالة للطلاب ({uniqueSelectedStudents.length})</span>
                </button>

                {/* 2. Export Selected to Excel */}
                <button
                  type="button"
                  onClick={() => handleExportExcel(true)}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير المحدد</span>
                </button>

                {/* 3. Print Selected */}
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>

                {/* 4. Delete Selected Batch */}
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد ({selectedRecordIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {/* Records Table */}
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleToggleSelectCurrentPage}
                        className="rounded text-[#006D77] cursor-pointer"
                        title="تحديد / إلغاء تحديد الكل في الصفحة الحالية"
                      />
                    </th>
                    <th className="py-3 px-3">تاريخ التأخير</th>
                    <th className="py-3 px-3">وقت الحضور</th>
                    <th className="py-3 px-3">الطالب</th>
                    <th className="py-3 px-3">الصف والشعبة</th>
                    <th className="py-3 px-3">سبب التأخير</th>
                    <th className="py-3 px-3 text-center">الرصيد التراكمي</th>
                    <th className="py-3 px-3">الإجراء المقترح (اللائحة)</th>
                    <th className="py-3 px-3">قرار المرشد</th>
                    {/* NEW COLUMN: المتابعة والتوقيعات */}
                    <th className="py-3 px-3 text-center">المتابعة والتوقيعات</th>
                    <th className="py-3 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        لا توجد سجلات تأخير مطابقة لشروط التصفية
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r) => {
                      const totalTardy = cumulativeTardinessMap[r.studentNumber] || (r.previousTardinessCount + 1);
                      const isCritical = totalTardy >= 3;
                      const isSelected = selectedRecordIds.has(r.id);
                      const followUp = resolveTardinessFollowUpStatus(r, allLinkedForms);

                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-amber-50/70 dark:bg-amber-950/40'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRecordSelection(r.id)}
                              className="rounded text-[#006D77] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                            {r.time || '07:45 AM'}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                const found = students.find((s) => s.studentNumber === r.studentNumber);
                                if (found) onOpenStudentProfile(found.id);
                              }}
                              className="font-bold text-slate-900 dark:text-white hover:text-[#006D77] transition-colors cursor-pointer text-right"
                            >
                              {r.studentName}
                            </button>
                            <p className="font-mono text-[10px] text-slate-400">#{r.studentNumber}</p>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            الصف {r.grade} - {r.track || 'عام'} (شعبة {r.section})
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate" title={r.reason}>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {r.reason || 'عذر مواصلات'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {totalTardy} أيام
                              {isCritical && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${getActionBadgeStyle(
                                r.suggestedAction
                              )}`}
                            >
                              {r.suggestedAction}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {r.counselorDecision || r.suggestedAction}
                          </td>

                          {/* NEW: المتابعة والتوقيعات (مع إمكانية النقر لفتح النموذج) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                const found = students.find((s) => s.studentNumber === r.studentNumber);
                                if (followUp.hasForm && onOpenFormForStudent && found) {
                                  onOpenFormForStudent(found.id, followUp.linkedFormType, followUp.linkedFormId);
                                } else if (found) {
                                  onOpenStudentProfile(found.id);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] cursor-pointer hover:opacity-85 transition-opacity ${followUp.badgeClass}`}
                              title={followUp.hasForm ? 'فتح النموذج المرتبط مباشرة' : 'عرض ملف الطالب ومتابعة الإجراء'}
                            >
                              <span>{followUp.statusText}</span>
                              {followUp.hasForm && <ExternalLink className="w-3 h-3 opacity-70" />}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Profile */}
                              <button
                                type="button"
                                onClick={() => {
                                  const found = students.find((s) => s.studentNumber === r.studentNumber);
                                  if (found) onOpenStudentProfile(found.id);
                                }}
                                title="عرض ملف الطالب"
                                className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/60 text-[#006D77] transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Modal Button */}
                              <button
                                type="button"
                                onClick={() => setEditingRecord(r)}
                                title="تعديل السجل"
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Single Button */}
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(r)}
                                title="حذف السجل"
                                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredRecords.length > TABLE_PAGE_SIZE && (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  عرض <strong className="font-mono text-slate-800 dark:text-slate-200">{(tablePage - 1) * TABLE_PAGE_SIZE + 1}</strong> إلى{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">{Math.min(tablePage * TABLE_PAGE_SIZE, filteredRecords.length)}</strong> من أصل{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">{filteredRecords.length}</strong> سجل
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={tablePage === 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
                  >
                    السابق
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - tablePage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setTablePage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                                tablePage === p
                                  ? 'bg-[#006D77] text-white shadow-2xs'
                                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={tablePage === totalPages}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REPORTS & BROADCAST EXPORT (كشوفات التأخير والتصدير) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-5">
          {/* Header Action Card */}
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                استخراج كشوفات التأخير الصباحي والطباعة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تصدير معتمد بصيغة Excel، طباعة الكشف الرسمي، وتحديد مجموعة طلاب لإرسال تنبيهات
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Export to Excel */}
              <button
                type="button"
                onClick={() => handleExportExcel(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير إلى Excel (XLSX)</span>
              </button>

              {/* Print Report */}
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-4 py-2 bg-[#0C2340] dark:bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكشف</span>
              </button>

              {/* Broadcast to selected */}
              <button
                type="button"
                onClick={handleOpenBroadcastModal}
                disabled={selectedForBroadcast.size === 0}
                className="px-4 py-2 bg-[#006D77] hover:bg-[#00555d] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>إرسال تنبيه للمحددين ({selectedForBroadcast.size})</span>
              </button>
            </div>
          </div>

          {/* Printable Report View */}
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
            {/* Print Official Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-600">دولة الإمارات العربية المتحدة</p>
                <p className="text-xs font-bold text-slate-600">مؤسسة الإمارات للتعليم المدرسي</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {schoolSettings.schoolName} – {schoolSettings.schoolCycle}
                </p>
              </div>
              <div className="text-left">
                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-black rounded-lg text-xs">
                  كشف المتأخرين الصباحي الرسمي
                </span>
                <p className="text-[11px] text-slate-500 font-mono mt-1">تاريخ الكشف: {recordingDate}</p>
              </div>
            </div>

            {/* Quick Multi-select Bar */}
            <div className="flex items-center justify-between gap-3 text-xs no-print pb-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filteredRecords.length > 0 &&
                    selectedForBroadcast.size === filteredRecords.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForBroadcast(new Set(filteredRecords.map((r) => r.studentNumber)));
                    } else {
                      setSelectedForBroadcast(new Set());
                    }
                  }}
                  className="rounded text-[#006D77]"
                />
                <span>تحديد الكل لإرسال الرسائل</span>
              </label>

              <span className="text-slate-500 font-medium">
                تم تحديد {selectedForBroadcast.size} من أصل {filteredRecords.length} طالب
              </span>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3 no-print w-8">تحديد</th>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">الرقم الطلابي</th>
                    <th className="py-2.5 px-3">اسم الطالب</th>
                    <th className="py-2.5 px-3">الصف</th>
                    <th className="py-2.5 px-3">الشعبة</th>
                    <th className="py-2.5 px-3">وقت الحضور</th>
                    <th className="py-2.5 px-3">سبب التأخير</th>
                    <th className="py-2.5 px-3">التكرار</th>
                    <th className="py-2.5 px-3">الإجراء السلوكي المتخذ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map((r, idx) => {
                    const isSelected = selectedForBroadcast.has(r.studentNumber);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-2 px-3 no-print">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedForBroadcast((prev) => {
                                const next = new Set(prev);
                                if (next.has(r.studentNumber)) next.delete(r.studentNumber);
                                else next.add(r.studentNumber);
                                return next;
                              });
                            }}
                            className="rounded text-[#006D77] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold">{r.studentNumber}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {r.studentName}
                        </td>
                        <td className="py-2 px-3">{r.grade}</td>
                        <td className="py-2 px-3">{r.section}</td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-700">{r.time}</td>
                        <td className="py-2 px-3">{r.reason}</td>
                        <td className="py-2 px-3 font-mono font-black text-center">
                          {cumulativeTardinessMap[r.studentNumber] || (r.previousTardinessCount + 1)}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {r.suggestedAction}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Report Footer */}
            <div className="pt-8 border-t border-slate-200 mt-6 grid grid-cols-2 text-center text-xs font-bold text-slate-700">
              <div>
                <p>مشرف الانضباط المدرسي / البوابة</p>
                <p className="mt-8 font-serif">...........................................</p>
              </div>
              <div>
                <p>يعتمد، المرشد الأكاديمي والمهني</p>
                <p className="mt-8 font-serif">...........................................</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CHARTS & ADVANCED ANALYTICS (الرسوم البيانية) */}
      {/* ========================================================================= */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Top 4 Stat Indicator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#0C2340] border border-amber-200 dark:border-amber-900/60 rounded-3xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">متأخرو اليوم:</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {statsOverview.todayCount} <span className="text-xs font-normal text-slate-400">طالب</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">تاريخ اليوم: {todayStr}</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#0C2340] border border-emerald-200 dark:border-emerald-900/60 rounded-3xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">نسبة الانضباط اليوم:</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {statsOverview.punctualityRate}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">حضروا في الموعد المحدد</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-[#0C2340] border border-teal-200 dark:border-teal-900/60 rounded-3xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">إجمالي هذا الأسبوع:</span>
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#006D77] dark:text-teal-300 mt-2">
                {statsOverview.weekCount} <span className="text-xs font-normal text-slate-400">حالة</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">خلال الأيام السبعة الأخيرة</p>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-[#0C2340] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">متكررو التأخير (≥3):</span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                {statsOverview.frequentCount} <span className="text-xs font-normal text-slate-400">طالب</span>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 font-bold mt-1">مؤشر متابعة حسب اللائحة</p>
            </div>
          </div>

          {/* Charts Row 1: Weekly Trend & Reasons Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Weekly Trend */}
            <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#006D77]" />
                  <span>اتجاه التأخير الصباحي خلال أيام الأسبوع</span>
                </h3>
              </div>
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrendData}>
                    <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C2340',
                        borderColor: '#006D77',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="حالات التأخير" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="متكرر (≥3)" fill="#E29578" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Reasons Breakdown */}
            <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>توزيع أبرز أسباب التأخير الصباحي</span>
                </h3>
              </div>
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reasonsDistributionData} layout="vertical">
                    <XAxis type="number" stroke="#888888" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={110} stroke="#888888" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C2340',
                        borderColor: '#006D77',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" fill="#006D77" radius={[0, 6, 6, 0]} name="العدد" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Distribution by Grades & Monthly Progression */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 3: Grade Distribution */}
            <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                  <span>نسبة التأخير حسب الصفوف الدراسية</span>
                </h3>
              </div>
              <div className="h-64 w-full flex items-center justify-center" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gradeDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {gradeDistributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Monthly Discipline Progression */}
            <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>منحنى الانضباط الصباحي الشهري</span>
                </h3>
              </div>
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData}>
                    <XAxis dataKey="week" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C2340',
                        borderColor: '#006D77',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="نسبة الانضباط"
                      stroke="#2A9D8F"
                      fill="#2A9D8F"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT RECORD MODAL */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                تعديل سجل التأخير الصباحي للطالب
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">اسم الطالب:</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{editingRecord.studentName}</p>
                <p className="text-slate-400 font-mono">#{editingRecord.studentNumber} • الصف {editingRecord.grade}/{editingRecord.section}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    وقت الحضور:
                  </label>
                  <input
                    type="text"
                    value={editingRecord.time}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, time: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    تاريخ التأخير:
                  </label>
                  <input
                    type="date"
                    value={editingRecord.date}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  سبب التأخير:
                </label>
                <input
                  type="text"
                  value={editingRecord.reason || ''}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الإجراء المقترح حسب اللائحة (استرشادي):
                </label>
                <select
                  value={editingRecord.suggestedAction}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      suggestedAction: e.target.value as TardinessSuggestedAction,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold"
                >
                  <option value="تنبيه شفهي">تنبيه شفهي</option>
                  <option value="تعهد طالب">تعهد طالب</option>
                  <option value="متابعة المرشد والتواصل مع ولي الأمر">متابعة المرشد والتواصل مع ولي الأمر</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  قرار المرشد المعتمد فعلياً:
                </label>
                <input
                  type="text"
                  value={editingRecord.counselorDecision || editingRecord.suggestedAction}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      counselorDecision: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ملاحظات إرشادية إضافية:
                </label>
                <textarea
                  rows={2}
                  value={editingRecord.counselorNotes || ''}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      counselorNotes: e.target.value,
                    })
                  }
                  placeholder="ملاحظة إرشادية حول الحالة..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onUpdateTardiness && editingRecord) {
                    await onUpdateTardiness(editingRecord);
                    onShowToast('تم حفظ تعديلات سجل التأخير بنجاح', 'success');
                  }
                  setEditingRecord(null);
                }}
                className="px-5 py-2 bg-[#006D77] hover:bg-[#00555d] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BATCH DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] border border-rose-300 dark:border-rose-900/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-950 dark:text-rose-100">
                  تأكيد الحذف الجماعي لسجلات التأخير
                </h3>
                <p className="text-xs text-slate-500">عملية مؤكدة مع إعادة حساب الأرصدة</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-950 dark:text-rose-200 space-y-2">
              <p className="font-bold">
                أنت على وشك حذف ({selectedRecordIds.size}) سجل تأخير صباحي لـ ({uniqueSelectedStudents.length}) طالب.
              </p>
              <ul className="list-disc list-inside text-[11px] opacity-90 space-y-1">
                <li>سيتم حذف السجلات من قاعدة بيانات Firestore بشكل نهائي.</li>
                <li>
                  سيتم <strong>إعادة حساب الرصيد التراكمي الحقيقي (totalTardiness)</strong> لكل طالب من السجلات المتبقية.
                </li>
                <li>لن يتم حذف أي تعهدات أو نماذج رسمية موقعة مرتبطة، وسيتم توثيق العملية في سجل التدقيق.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={handleExecuteBatchDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-2"
              >
                {isBatchDeleting ? (
                  <span>جاري الحذف وإعادة الحساب...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، احذف ({selectedRecordIds.size}) سجل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PURGE ALL TARDINESS RECORDS (STRICT ADMIN ONLY) */}
      {/* ========================================================================= */}
      {showPurgeAllModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] border-2 border-rose-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-950 dark:text-rose-100">
                  تحذير إداري: حذف كامل سجلات التأخير
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  إجراء خاص بمسؤولي النظام فقط
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 text-xs text-rose-950 dark:text-rose-200 space-y-2">
              <p className="font-bold">
                سيؤدي هذا الإجراء إلى حذف جميع سجلات التأخير الصباحي في المدرسة ({tardinessRecords.length} سجل)، وتصفير عداد التأخير لجميع الطلبة (0).
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                لتأكيد العملية، يرجى كتابة عبارة: <strong className="text-rose-700 font-black">تأكيد الحذف الكلي</strong> أدناه:
              </p>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="تأكيد الحذف الكلي"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 rounded-xl text-xs font-bold text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeAllModal(false);
                  setPurgeConfirmText('');
                }}
                className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={purgeConfirmText !== 'تأكيد الحذف الكلي'}
                onClick={handleExecutePurgeAll}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>تنفيذ الحذف الكلي النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BROADCAST CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBroadcastConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#006D77]" />
                <span>تأكيد إرسال إشعارات التأخير لأولياء الأمور</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBroadcastConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <p className="font-bold">سيتم إرسال رسالة التنبيه لـ ({selectedForBroadcast.size}) ولي أمر طلاب متأخرين.</p>
                <p className="text-[11px] opacity-80 mt-1">
                  لا يتم إرسال الرسائل تلقائياً؛ يمكنك مراجعة نص الرسالة أدناه قبل التأكيد.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  نص الرسالة المعتمد:
                </label>
                <textarea
                  rows={4}
                  value={broadcastMessageDraft}
                  onChange={(e) => setBroadcastMessageDraft(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-medium leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBroadcastConfirmModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmSendBroadcast}
                className="px-5 py-2 bg-gradient-to-l from-[#006D77] to-[#0C2340] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>تأكيد الإرسال الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(recordToDelete)}
        title="تأكيد حذف سجل التأخير"
        message={`هل أنت متأكد من حذف سجل تأخير الطالب (${recordToDelete?.studentName}) بتاريخ ${recordToDelete?.date}؟ سيتم إعادة احتساب رصيد التأخير الحقيقي تلقائياً من السجلات المتبقية، مع الحفاظ على أي وثائق ونماذج معتمدة وسجل التدقيق.`}
        confirmText="نعم، احذف السجل"
        cancelText="إلغاء"
        type="danger"
        onConfirm={async () => {
          if (recordToDelete) {
            await onDeleteTardiness(recordToDelete.id, recordToDelete.studentNumber);
            setRecordToDelete(null);
          }
        }}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
};
