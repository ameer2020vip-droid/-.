import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Phone,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Settings2,
  X,
  User,
  Users,
  GraduationCap,
} from 'lucide-react';
import {
  Student,
  GradeLevel,
  SectionName,
  AcademicTrack,
  ViolationRecord,
  TardinessRecord,
  AbsenceRecord,
} from '../types';
import { EditStudentModal } from '../components/EditStudentModal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  getViolations,
  getTardinessRecords,
  getAbsences,
  getPositiveBehaviorRecords,
  STORAGE_EVENT_NAME,
} from '../storage';
import {
  compareGrades,
  compareSections,
  getGradeDisplayLabel,
  getUniqueStudentTardinessDates,
  getStudentTardinessRecordsList,
} from '../hooks/useAcademicFiltering';

export type SortField =
  | 'name_asc'
  | 'name_desc'
  | 'studentNumber_asc'
  | 'studentNumber_desc'
  | 'grade_section'
  | 'behavior_desc'
  | 'behavior_asc'
  | 'violations_desc'
  | 'tardiness_desc'
  | 'absences_desc';

interface StudentsPageProps {
  students: Student[];
  tardinessRecords?: TardinessRecord[];
  violations?: ViolationRecord[];
  absences?: AbsenceRecord[];
  onOpenProfile: (studentId: string) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenManageModal?: () => void;
  onOpenTrackCorrection?: () => void;
  onNavigateToTardiness: (studentId?: string) => void;
  onNavigateToViolation: (studentId?: string) => void;
  onUpdateStudent?: (studentId: string, updates: Partial<Omit<Student, 'id'>>) => Promise<void>;
  onDeleteStudent?: (studentId: string, studentName: string) => Promise<void>;
  isViewer?: boolean;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  tardinessRecords: propTardinessRecords,
  violations: propViolations,
  absences: propAbsences,
  onOpenProfile,
  onOpenAddModal,
  onOpenImportModal,
  onOpenManageModal,
  onOpenTrackCorrection,
  onNavigateToTardiness,
  onNavigateToViolation,
  onUpdateStudent,
  onDeleteStudent,
  isViewer = false,
}) => {
  // Live storage & Firestore records for true counts and KPIs
  const [storageViolations, setStorageViolations] = useState<ViolationRecord[]>(() => getViolations());
  const [storageTardiness, setStorageTardiness] = useState<TardinessRecord[]>(() => getTardinessRecords());
  const [storageAbsences, setStorageAbsences] = useState<AbsenceRecord[]>(() => getAbsences());
  const [positiveRecords, setPositiveRecords] = useState(() => getPositiveBehaviorRecords());

  // Listen to storage update event asynchronously to avoid setState during render
  useEffect(() => {
    let timer: any = null;
    const handleStorageUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setStorageViolations(getViolations());
        setStorageTardiness(getTardinessRecords());
        setStorageAbsences(getAbsences());
        setPositiveRecords(getPositiveBehaviorRecords());
      }, 50);
    };

    window.addEventListener(STORAGE_EVENT_NAME, handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(STORAGE_EVENT_NAME, handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const violationsList = useMemo(() => {
    if (propViolations && propViolations.length > 0) return propViolations;
    return storageViolations;
  }, [propViolations, storageViolations]);

  const tardinessList = useMemo(() => {
    if (propTardinessRecords && propTardinessRecords.length > 0) return propTardinessRecords;
    return storageTardiness;
  }, [propTardinessRecords, storageTardiness]);

  const absencesList = useMemo(() => {
    if (propAbsences && propAbsences.length > 0) return propAbsences;
    return storageAbsences;
  }, [propAbsences, storageAbsences]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sort State (Default is name_asc: أ → ي as requested)
  const [sortOption, setSortOption] = useState<SortField>('name_asc');

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Menu States
  const [selectedStudentToEdit, setSelectedStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [tardinessDatesPreviewStudent, setTardinessDatesPreviewStudent] = useState<Student | null>(null);
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close row popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuStudentId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Build Academic Triples from real student data
  const academicTriples = useMemo(() => {
    const triples = new Map<string, Map<string, Set<string>>>();

    students.forEach((s) => {
      const grade = s.grade;
      const track = s.track || 'عام';
      const section = String(s.section);

      if (!triples.has(grade)) {
        triples.set(grade, new Map());
      }
      const trackMap = triples.get(grade)!;
      if (!trackMap.has(track)) {
        trackMap.set(track, new Set());
      }
      trackMap.get(track)!.add(section);
    });

    return triples;
  }, [students]);

  // 2. Available Grades sorted dynamically in ascending academic order (5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12)
  const availableGrades = useMemo(() => {
    const existingGrades: string[] = Array.from(academicTriples.keys());
    return existingGrades.sort(compareGrades);
  }, [academicTriples]);

  // 3. Available Tracks (Dynamic based on selected grade)
  const availableTracks = useMemo(() => {
    if (gradeFilter === 'all' || !academicTriples.has(gradeFilter)) {
      const allTracks = new Set<string>();
      students.forEach((s) => allTracks.add(s.track || 'عام'));
      return Array.from(allTracks).sort();
    }
    return Array.from(academicTriples.get(gradeFilter)!.keys()).sort();
  }, [academicTriples, gradeFilter, students]);

  // 4. Available Sections (Dynamic based on selected grade and track)
  const availableSections = useMemo(() => {
    if (gradeFilter === 'all') {
      const allSecs = new Set<string>();
      students.forEach((s) => allSecs.add(String(s.section)));
      return Array.from(allSecs).sort(compareSections);
    }

    const trackMap = academicTriples.get(gradeFilter);
    if (!trackMap) return [];

    if (trackFilter === 'all') {
      const allSecs = new Set<string>();
      trackMap.forEach((sections) => {
        sections.forEach((sec) => allSecs.add(sec));
      });
      return Array.from(allSecs).sort(compareSections);
    }

    return Array.from(trackMap.get(trackFilter) || []).sort(compareSections);
  }, [academicTriples, gradeFilter, trackFilter, students]);

  // Handlers for filter adjustments with page reset
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleGradeChange = (val: string) => {
    setGradeFilter(val);
    setTrackFilter('all');
    setSectionFilter('all');
    setCurrentPage(1);
  };

  const handleTrackChange = (val: string) => {
    setTrackFilter(val);
    setSectionFilter('all');
    setCurrentPage(1);
  };

  const handleSectionChange = (val: string) => {
    setSectionFilter(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val: SortField) => {
    setSortOption(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setGradeFilter('all');
    setTrackFilter('all');
    setSectionFilter('all');
    setStatusFilter('all');
    setSortOption('name_asc');
    setCurrentPage(1);
  };

  // Helper: Count true violations for student
  const getStudentViolationsCount = useMemo(() => {
    return (s: Student) => {
      const direct = violationsList.filter(
        (v) =>
          v.studentId === s.id ||
          (s.studentNumber && v.studentNumber === s.studentNumber)
      ).length;
      return Math.max(s.totalViolations || 0, direct);
    };
  }, [violationsList]);

  // Helper: Count true tardiness for student from actual unique tardiness dates
  const getStudentTardinessCount = useMemo(() => {
    return (s: Student) => {
      const uniqueDates = getUniqueStudentTardinessDates(s, tardinessList);
      return uniqueDates.length;
    };
  }, [tardinessList]);

  // Helper: Count true absences for student
  const getStudentAbsencesCount = useMemo(() => {
    return (s: Student) => {
      const direct = absencesList.filter(
        (a) =>
          a.studentId === s.id ||
          (s.studentNumber && a.studentNumber === s.studentNumber)
      ).length;
      return Math.max(s.totalAbsences || 0, direct);
    };
  }, [absencesList]);

  // Helper: Calculate true behavior score from system data
  const getStudentBehaviorScore = useMemo(() => {
    return (s: Student): number => {
      if (typeof (s as any).behaviorScore === 'number') {
        return Math.max(0, Math.min(100, (s as any).behaviorScore));
      }

      const sViolations = violationsList.filter(
        (v) =>
          v.studentId === s.id ||
          (s.studentNumber && v.studentNumber === s.studentNumber)
      );

      let deductions = 0;
      if (sViolations.length > 0) {
        deductions = sViolations.reduce((sum, v) => {
          if (typeof v.deductionMarks === 'number') return sum + v.deductionMarks;
          if (v.violationDegree?.includes('الرابعة')) return sum + 12;
          if (v.violationDegree?.includes('الثالثة')) return sum + 8;
          if (v.violationDegree?.includes('الثانية')) return sum + 4;
          if (v.violationDegree?.includes('الأولى')) return sum + 2;
          return sum + 4;
        }, 0);
      } else if (s.totalViolations) {
        deductions = s.totalViolations * 4;
      }

      // Recovered points from positive behavior
      const sPositive = positiveRecords.filter(
        (p) =>
          p.studentId === s.id ||
          (s.studentNumber && p.studentNumber === s.studentNumber)
      );
      const recovered = sPositive.reduce((sum, p) => sum + (p.recoveredMarks || 0), 0);

      return Math.max(0, Math.min(100, 100 - deductions + recovered));
    };
  }, [violationsList, positiveRecords]);

  // KPI Calculations from REAL data
  const totalStudentsCount = students.length;

  const excellentBehaviorCount = useMemo(() => {
    return students.filter((s) => getStudentBehaviorScore(s) >= 90).length;
  }, [students, getStudentBehaviorScore]);

  const underMonitoringCount = useMemo(() => {
    return students.filter(
      (s) =>
        s.status === 'متابع سلوكيًا' ||
        s.status === 'في غرفة الإرشاد' ||
        s.status === 'إنذار أول' ||
        getStudentBehaviorScore(s) < 90
    ).length;
  }, [students, getStudentBehaviorScore]);

  const activeViolationsCount = useMemo(() => {
    const active = violationsList.filter(
      (v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب'
    ).length;
    return active > 0 ? active : violationsList.length;
  }, [violationsList]);

  const totalTardinessCasesCount = tardinessList.length;
  const totalAbsenceCasesCount = absencesList.length;

  // Track review count
  const needsReviewCount = useMemo(() => {
    return students.filter((s) => s.track === 'يحتاج مراجعة').length;
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return students.filter((s) => {
      // Search
      const matchSearch =
        query === '' ||
        s.fullName.toLowerCase().includes(query) ||
        s.studentNumber.toLowerCase().includes(query) ||
        (s.nationalId && s.nationalId.toLowerCase().includes(query)) ||
        (s.parentName && s.parentName.toLowerCase().includes(query)) ||
        (s.parentPhone && s.parentPhone.includes(query));

      if (!matchSearch) return false;

      // Grade
      if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false;

      // Track
      if (trackFilter !== 'all' && (s.track || 'عام') !== trackFilter) return false;

      // Section
      if (sectionFilter !== 'all' && String(s.section) !== sectionFilter) return false;

      // Status / Behavior filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'excellent_behavior') {
          if (getStudentBehaviorScore(s) < 90) return false;
        } else if (statusFilter === 'under_monitoring') {
          const isMonitored =
            s.status === 'متابع سلوكيًا' ||
            s.status === 'في غرفة الإرشاد' ||
            s.status === 'إنذار أول' ||
            getStudentBehaviorScore(s) < 90;
          if (!isMonitored) return false;
        } else if (statusFilter === 'has_violations') {
          if (getStudentViolationsCount(s) === 0) return false;
        } else if (statusFilter === 'has_tardiness') {
          if (getStudentTardinessCount(s) < 3) return false;
        } else if (s.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    searchTerm,
    gradeFilter,
    trackFilter,
    sectionFilter,
    statusFilter,
    getStudentBehaviorScore,
    getStudentViolationsCount,
    getStudentTardinessCount,
  ]);

  // Sorted Students
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];

    switch (sortOption) {
      case 'name_asc':
        return list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
      case 'name_desc':
        return list.sort((a, b) => b.fullName.localeCompare(a.fullName, 'ar'));
      case 'studentNumber_asc':
        return list.sort((a, b) =>
          a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true })
        );
      case 'studentNumber_desc':
        return list.sort((a, b) =>
          b.studentNumber.localeCompare(a.studentNumber, undefined, { numeric: true })
        );
      case 'grade_section': {
        return list.sort((a, b) => {
          const gDiff = compareGrades(a.grade, b.grade);
          if (gDiff !== 0) return gDiff;
          return compareSections(String(a.section), String(b.section));
        });
      }
      case 'behavior_desc':
        return list.sort((a, b) => getStudentBehaviorScore(b) - getStudentBehaviorScore(a));
      case 'behavior_asc':
        return list.sort((a, b) => getStudentBehaviorScore(a) - getStudentBehaviorScore(b));
      case 'violations_desc':
        return list.sort((a, b) => getStudentViolationsCount(b) - getStudentViolationsCount(a));
      case 'tardiness_desc':
        return list.sort((a, b) => getStudentTardinessCount(b) - getStudentTardinessCount(a));
      case 'absences_desc':
        return list.sort((a, b) => getStudentAbsencesCount(b) - getStudentAbsencesCount(a));
      default:
        return list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    }
  }, [
    filteredStudents,
    sortOption,
    getStudentBehaviorScore,
    getStudentViolationsCount,
    getStudentTardinessCount,
    getStudentAbsencesCount,
  ]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const startIndex = sortedStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, sortedStudents.length);

  const isFiltered =
    Boolean(searchTerm) ||
    gradeFilter !== 'all' ||
    trackFilter !== 'all' ||
    sectionFilter !== 'all' ||
    statusFilter !== 'all';

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      '#',
      'الرقم الطلابي',
      'اسم الطالب',
      'الصف',
      'المسار',
      'الشعبة',
      'ولي الأمر / المسؤول',
      'هاتف ولي الأمر',
      'درجة السلوك',
      'المخالفات',
      'التأخير',
      'الغياب',
      'الحالة',
    ];

    const rows = sortedStudents.map((s, idx) => [
      idx + 1,
      `"${s.studentNumber}"`,
      `"${s.fullName}"`,
      `"${s.grade}"`,
      `"${s.track || 'عام'}"`,
      `"${s.section}"`,
      `"${s.parentName || ''}${s.parentRelation ? ` (${s.parentRelation})` : ''}"`,
      `"${s.parentPhone || ''}"`,
      `${getStudentBehaviorScore(s)}`,
      `${getStudentViolationsCount(s)}`,
      `${getStudentTardinessCount(s)}`,
      `${getStudentAbsencesCount(s)}`,
      `"${s.status}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `سجل_الطلبة_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Status badge color
  const getStatusBadge = (status: Student['status'], score: number) => {
    if (status === 'منتظم' && score >= 90) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (status === 'متابع سلوكيًا' || (score < 90 && score >= 75)) {
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    }
    if (status === 'إنذار أول' || score < 75) {
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    }
    if (status === 'في غرفة الإرشاد') {
      return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <div className="space-y-5 text-right font-sans" dir="rtl">
      {/* 1. رأس الصفحة (Header Card) */}
      <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] dark:text-teal-400 shrink-0 shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                سجل الطلبة
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200/60 dark:border-slate-700">
                {totalStudentsCount} طالب
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              إدارة بيانات الطلبة ومتابعة السلوك والمواظبة في جميع الصفوف والمسارات
            </p>
          </div>
        </div>

        {/* Action Buttons matching the reference design */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isViewer && (
            <button
              type="button"
              id="btn-open-add-student"
              onClick={onOpenAddModal}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#D4AF37]" />
              <span>إضافة طالب جديد</span>
            </button>
          )}

          {!isViewer && (
            <button
              type="button"
              id="btn-open-import-excel"
              onClick={onOpenImportModal}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>استيراد Excel / CSV</span>
            </button>
          )}

          <button
            type="button"
            id="btn-export-students"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="تصدير بيانات الطلبة ومصفوفة السلوك بتنسيق CSV"
          >
            <Download className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
            <span>ملء المصفوفة / تصدير</span>
          </button>

          {/* Secondary management buttons */}
          {!isViewer && onOpenTrackCorrection && needsReviewCount > 0 && (
            <button
              type="button"
              onClick={onOpenTrackCorrection}
              className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center gap-1 cursor-pointer"
              title="تدقيق وتصحيح المسار للطلبة غير المحددين"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مراجعة المسار ({needsReviewCount})</span>
            </button>
          )}

          {!isViewer && onOpenManageModal && (
            <button
              type="button"
              onClick={onOpenManageModal}
              className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="إدارة وحذف السجلات"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. بطاقات الإحصائيات (6 KPI Cards matching the reference design) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Students */}
        <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono block">
              {totalStudentsCount}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              إجمالي الطلبة
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-900">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Excellent Behavior */}
        <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {excellentBehaviorCount}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              رصيد السلوك ممتاز
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <span>↑</span>
              <span>{totalStudentsCount ? Math.round((excellentBehaviorCount / totalStudentsCount) * 100) : 0}%</span>
              <span className="text-slate-400 font-normal">من الطلبة</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Under Monitoring */}
        <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {underMonitoringCount}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              قيد المتابعة
            </span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mt-0.5">
              <span>⚠️</span>
              <span>{totalStudentsCount ? Math.round((underMonitoringCount / totalStudentsCount) * 100) : 0}%</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Active Violations */}
        <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {activeViolationsCount}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              مخالفات نشطة
            </span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 mt-0.5">
              <span>↓</span>
              <span>{violationsList.length} إجمالي</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Tardiness Cases */}
        <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono">
                {totalTardinessCasesCount}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              حالات تأخر
            </span>
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-0.5 mt-0.5">
              <span>⏱</span>
              <span>سجل الحضور</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 6: Absence Cases */}
        <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {totalAbsenceCasesCount}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              حالات غياب
            </span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-0.5 mt-0.5">
              <span>📅</span>
              <span>أيام الغياب</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. شريط البحث والفلاتر في صف واحد مرتب (Search & Single-Row Filters Bar) */}
      <div className="bg-white dark:bg-[#0C2340] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              id="student-search-input"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="البحث بالاسم، أو الرقم الطلابي، أو ولي الأمر..."
              className="w-full pr-10 pl-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter 1: Grade */}
          <div className="w-full sm:w-auto min-w-[130px]">
            <select
              value={gradeFilter}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] cursor-pointer"
            >
              <option value="all">كل الصفوف</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {getGradeDisplayLabel(g)}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Track */}
          <div className="w-full sm:w-auto min-w-[130px]">
            <select
              value={trackFilter}
              onChange={(e) => handleTrackChange(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] cursor-pointer"
            >
              <option value="all">كل المسارات</option>
              {availableTracks.map((t) => (
                <option key={t} value={t}>
                  {t === 'عام' ? 'المسار العام' : t === 'متقدم' ? 'المسار المتقدم' : t}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Section (Dynamic) */}
          <div className="w-full sm:w-auto min-w-[120px]">
            <select
              value={sectionFilter}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] cursor-pointer"
            >
              <option value="all">كل الشعب</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  شعبة {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Behavior Status */}
          <div className="w-full sm:w-auto min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#006D77] cursor-pointer"
            >
              <option value="all">كل حالات السلوك</option>
              <option value="منتظم">منتظم (سلوك معتمد)</option>
              <option value="excellent_behavior">رصيد ممتاز (90 - 100)</option>
              <option value="under_monitoring">قيد المتابعة (&lt; 90)</option>
              <option value="has_violations">لديه مخالفات مسجلة</option>
              <option value="has_tardiness">تأخر متكرر (3+)</option>
              <option value="إنذار أول">إنذار أول</option>
              <option value="في غرفة الإرشاد">في غرفة الإرشاد</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-1 cursor-pointer shrink-0 transition-colors"
              title="إلغاء جميع الفلاتر والبحث"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. شريط معلومات الجدول والفرز وعدد الطلاب (Table Meta Bar) */}
      <div className="bg-white dark:bg-[#0C2340] px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Page size selector */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold">
          <span>عرض</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>طالب لكل صفحة</span>
        </div>

        {/* Sort Select Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">
            الترتيب حسب:
          </span>
          <select
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value as SortField)}
            className="w-full sm:w-auto py-1 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[#006D77] dark:text-teal-400 focus:outline-hidden cursor-pointer"
          >
            <option value="name_asc">الاسم أبجديًا: أ → ي (افتراضي)</option>
            <option value="name_desc">الاسم أبجديًا: ي → أ</option>
            <option value="studentNumber_asc">الرقم الطلابي: تصاعدي</option>
            <option value="studentNumber_desc">الرقم الطلابي: تنازلي</option>
            <option value="grade_section">الصف ثم الشعبة</option>
            <option value="behavior_desc">درجة السلوك: الأعلى → الأقل</option>
            <option value="behavior_asc">درجة السلوك: الأقل → الأعلى</option>
            <option value="violations_desc">عدد المخالفات: الأعلى → الأقل</option>
            <option value="tardiness_desc">مرات التأخر: الأعلى → الأقل</option>
            <option value="absences_desc">أيام الغياب: الأعلى → الأقل</option>
          </select>
        </div>
      </div>

      {/* 5. جدول الطلبة الرئيسي (Comprehensive Student Directory Table) */}
      <div className="student-table-container bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-xs font-black select-none">
                <th className="py-3 px-3.5 w-12 text-center">#</th>

                {/* Clickable Column: Student Number */}
                <th
                  onClick={() =>
                    handleSortChange(
                      sortOption === 'studentNumber_asc'
                        ? 'studentNumber_desc'
                        : 'studentNumber_asc'
                    )
                  }
                  className="py-3.5 px-4 cursor-pointer hover:text-[#006D77] transition-colors text-right"
                  title="الضغط للفرز حسب الرقم الطلابي"
                >
                  <div className="flex items-center gap-1">
                    <span>الرقم الطلابي</span>
                    {sortOption === 'studentNumber_asc' && (
                      <ArrowUp className="w-3.5 h-3.5 text-[#006D77]" />
                    )}
                    {sortOption === 'studentNumber_desc' && (
                      <ArrowDown className="w-3.5 h-3.5 text-[#006D77]" />
                    )}
                    {sortOption !== 'studentNumber_asc' &&
                      sortOption !== 'studentNumber_desc' && (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                  </div>
                </th>

                {/* Clickable Column: Student Name */}
                <th
                  onClick={() =>
                    handleSortChange(
                      sortOption === 'name_asc' ? 'name_desc' : 'name_asc'
                    )
                  }
                  className="py-3.5 px-4 cursor-pointer hover:text-[#006D77] transition-colors min-w-[200px] text-right"
                  title="الضغط للفرز أبجديًا"
                >
                  <div className="flex items-center gap-1">
                    <span>اسم الطالب</span>
                    {sortOption === 'name_asc' && (
                      <ArrowUp className="w-3.5 h-3.5 text-[#006D77]" />
                    )}
                    {sortOption === 'name_desc' && (
                      <ArrowDown className="w-3.5 h-3.5 text-[#006D77]" />
                    )}
                    {sortOption !== 'name_asc' && sortOption !== 'name_desc' && (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>

                {/* Clickable Column: Grade (Wider to prevent wrapping) */}
                <th
                  onClick={() => handleSortChange('grade_section')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#006D77] transition-colors whitespace-nowrap min-w-[120px] text-right"
                  title="الضغط للفرز حسب الصف والشعبة"
                >
                  الصف
                </th>

                <th className="py-3.5 px-4 text-right">المسار</th>

                <th className="py-3.5 px-4 text-center">الشعبة</th>

                {/* Parent / Responsible Person Column */}
                <th className="py-3.5 px-4 min-w-[210px] text-right">
                  ولي الأمر / المسؤول
                </th>

                {/* Clickable Column: Behavior Score */}
                <th
                  onClick={() =>
                    handleSortChange(
                      sortOption === 'behavior_desc'
                        ? 'behavior_asc'
                        : 'behavior_desc'
                    )
                  }
                  className="py-3.5 px-4 cursor-pointer hover:text-[#006D77] transition-colors text-center min-w-[130px]"
                  title="الضغط للفرز حسب درجة السلوك"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>درجة السلوك</span>
                    {sortOption === 'behavior_desc' && (
                      <ArrowDown className="w-3.5 h-3.5 text-[#006D77]" />
                    )}
                    {sortOption === 'behavior_asc' && (
                      <ArrowUp className="w-3.5 h-3.5 text-[#006D77]" />
                    )}
                    {sortOption !== 'behavior_desc' &&
                      sortOption !== 'behavior_asc' && (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                  </div>
                </th>

                {/* Clickable Column: Violations / Tardiness */}
                <th
                  onClick={() =>
                    handleSortChange(
                      sortOption === 'violations_desc'
                        ? 'tardiness_desc'
                        : 'violations_desc'
                    )
                  }
                  className="py-3.5 px-4 cursor-pointer hover:text-[#006D77] transition-colors text-center min-w-[140px]"
                  title="الضغط للفرز حسب المخالفات أو التأخير"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>المخالفات / التأخير</span>
                    {sortOption === 'violations_desc' && (
                      <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    {sortOption === 'tardiness_desc' && (
                      <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                    )}
                    {sortOption !== 'violations_desc' &&
                      sortOption !== 'tardiness_desc' && (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                  </div>
                </th>

                <th className="py-3.5 px-4 text-center">الحالة</th>

                <th className="py-3.5 px-4 text-center w-28">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                      لا يوجد طلبة مطابقين لمعايير التصفية الحالية
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      يمكنك إعادة تعيين الفلاتر أو البحث بكلمة مختلفة
                    </p>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إلغاء جميع الفلاتر</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, index) => {
                  const trueScore = getStudentBehaviorScore(s);
                  const trueViolations = getStudentViolationsCount(s);
                  const trueTardies = getStudentTardinessCount(s);
                  const rowIndex = (currentPage - 1) * pageSize + index + 1;

                  // Score color scheme
                  const scoreColor =
                    trueScore >= 90
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : trueScore >= 75
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400';

                  const progressColor =
                    trueScore >= 90
                      ? 'bg-emerald-500'
                      : trueScore >= 75
                      ? 'bg-amber-500'
                      : 'bg-rose-500';

                  // Preserve real section value as imported
                  const sectionDisplay = s.section || 'غير محدد';
                  const hasMissingAcademicInfo =
                    !s.grade || s.grade === 'غير محدد' || !s.section || s.section === 'غير محدد' || s.hasMissingGradeOrSection;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* 1. Row Index */}
                      <td className="py-3.5 px-3.5 text-center text-xs font-mono text-slate-400">
                        {rowIndex}
                      </td>

                      {/* 2. Student Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-700 dark:text-slate-300 text-right">
                        {s.studentNumber}
                      </td>

                      {/* 3. Student Name */}
                      <td className="py-3.5 px-4 font-bold text-right">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(s.id)}
                          className="text-right font-black text-slate-900 dark:text-slate-100 hover:text-[#006D77] dark:hover:text-teal-400 transition-colors cursor-pointer text-xs sm:text-sm block"
                          title="عرض الملف السلوكي الموحد للطالب"
                        >
                          {s.fullName}
                        </button>
                      </td>

                      {/* 4. Grade (Never breaks lines) */}
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[120px] text-right">
                        {s.grade === 'غير محدد' || !s.grade ? (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentToEdit(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black cursor-pointer"
                            title="الصف غير محدد في ملف الاستيراد - اضغط لتحديد الصف"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>غير محدد</span>
                          </button>
                        ) : (
                          <span>{getGradeDisplayLabel(s.grade)}</span>
                        )}
                      </td>

                      {/* 5. Track */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            s.track === 'متقدم' || s.track === 'نخبة'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : s.track === 'يحتاج مراجعة'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {s.track || 'عام'}
                        </span>
                      </td>

                      {/* 6. Section */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-600 dark:text-slate-400">
                        {sectionDisplay === 'غير محدد' || hasMissingAcademicInfo ? (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentToEdit(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black cursor-pointer"
                            title="بيانات الصف أو الشعبة تحتاج مراجعة - اضغط للتعديل"
                          >
                            <span>{sectionDisplay}</span>
                          </button>
                        ) : (
                          sectionDisplay
                        )}
                      </td>

                      {/* 7. Parent / Responsible Person (Aligned to the Right) */}
                      <td className="py-3.5 px-4 text-xs min-w-[210px] text-right">
                        <div className="space-y-1 text-right">
                          <div className="flex flex-wrap items-center justify-start gap-1.5 text-right">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {s.parentName || 'ولي الأمر'}
                            </span>
                            {/* صلة القرابة وتحديد المسؤول الأساسي */}
                            <span className="text-[10px] font-bold text-[#006D77] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200/80 dark:border-teal-800/80 whitespace-nowrap">
                              {s.parentRelation ? `${s.parentRelation} (المسؤول الأساسي)` : 'المسؤول الأساسي'}
                            </span>
                            {/* شارة محايدة صغيرة إذا كانت هناك حالة أسرية خاصة مسجلة بالبيانات */}
                            {Boolean(
                              (s as any).parentsStatus ||
                              (s as any).familyStatus ||
                              (s as any).hasFamilySpecialCase
                            ) && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                title="توجد حالة أسرية خاصة مسجلة بملف الطالب"
                              >
                                حالة أسرية
                              </span>
                            )}
                          </div>

                          {/* رقم الهاتف: aligned to the right side */}
                          {s.parentPhone ? (
                            <div className="flex items-center justify-start gap-1.5 text-right">
                              <a
                                href={`tel:${s.parentPhone}`}
                                className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-[#006D77] dark:hover:text-teal-400 inline-flex items-center gap-1.5 transition-colors"
                                title="اتصال هاتفي بولي الأمر"
                              >
                                <Phone className="w-3 h-3 text-[#006D77] dark:text-teal-400 shrink-0" />
                                <span dir="ltr">{s.parentPhone}</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 block text-right">
                              الهاتف غير مسجل
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Behavior Score with Mini Progress Bar */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-mono font-black text-xs ${scoreColor}`}>
                            {trueScore} / 100
                          </span>
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${progressColor} transition-all`}
                              style={{ width: `${trueScore}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 9. Violations & Tardiness */}
                      <td className="py-3.5 px-4 text-center text-xs">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold">
                          <button
                            type="button"
                            onClick={() => onOpenProfile(s.id)}
                            className={`cursor-pointer hover:underline ${
                              trueViolations > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400'
                            }`}
                            title="عرض المخالفات في ملف الطالب"
                          >
                            {trueViolations} مخالفة
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => setTardinessDatesPreviewStudent(s)}
                            className={`cursor-pointer hover:underline ${
                              trueTardies > 0
                                ? 'text-sky-600 dark:text-sky-400 font-black'
                                : 'text-slate-400'
                            }`}
                            title="اضغط لعرض التواريخ الفعلية المحتسبة في رصيد التأخير التراكمي"
                          >
                            {trueTardies} تأخر
                          </button>
                        </div>
                      </td>

                      {/* 10. Student Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getStatusBadge(
                            s.status,
                            trueScore
                          )}`}
                        >
                          {s.status || 'منتظم'}
                        </span>
                      </td>

                      {/* 11. Actions */}
                      <td className="py-3.5 px-4 text-center relative">
                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          {/* More Options Dropdown Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuStudentId(
                                  activeMenuStudentId === s.id ? null : s.id
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="خيارات إضافية"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuStudentId === s.id && (
                              <div
                                ref={menuRef}
                                className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-1 text-right text-xs space-y-0.5 animate-in fade-in"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuStudentId(null);
                                    onOpenProfile(s.id);
                                  }}
                                  className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer font-bold"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#006D77]" />
                                  <span>الملف السلوكي</span>
                                </button>

                                {!isViewer && onNavigateToViolation && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuStudentId(null);
                                      onNavigateToViolation(s.id);
                                    }}
                                    className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 cursor-pointer font-bold"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>تسجيل مخالفة</span>
                                  </button>
                                )}

                                {!isViewer && onNavigateToTardiness && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuStudentId(null);
                                      onNavigateToTardiness(s.id);
                                    }}
                                    className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 flex items-center gap-2 cursor-pointer font-bold"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                                    <span>تسجيل تأخر</span>
                                  </button>
                                )}

                                {!isViewer && onUpdateStudent && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuStudentId(null);
                                      setSelectedStudentToEdit(s);
                                    }}
                                    className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer font-bold"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                                    <span>تعديل البيانات</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action 1: View Profile */}
                          <button
                            type="button"
                            onClick={() => onOpenProfile(s.id)}
                            className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-400 hover:text-[#006D77] dark:hover:text-teal-400 transition-colors cursor-pointer"
                            title="عرض الملف السلوكي الموحد"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Action 2: Edit Student */}
                          {!isViewer && onUpdateStudent && (
                            <button
                              type="button"
                              onClick={() => setSelectedStudentToEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="تعديل بيانات الطالب"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Action 3: Delete Student */}
                          {!isViewer && onDeleteStudent && (
                            <button
                              type="button"
                              onClick={() => setStudentToDelete(s)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="حذف سجل الطالب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. شريط التنقل والترقيم أسفل الجدول (Pagination Footer) */}
        <div className="bg-white dark:bg-[#0C2340] px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Summary */}
          <div className="text-slate-500 dark:text-slate-400 font-bold">
            عرض{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono font-black">
              {startIndex}
            </strong>{' '}
            –{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono font-black">
              {endIndex}
            </strong>{' '}
            من أصل{' '}
            <strong className="text-[#006D77] dark:text-teal-400 font-mono font-black">
              {sortedStudents.length}
            </strong>{' '}
            طالب
            {sortedStudents.length !== totalStudentsCount && (
              <span className="text-[11px] text-slate-400 font-normal mr-1">
                (من إجمالي {totalStudentsCount})
              </span>
            )}
          </div>

          {/* Pagination Controls matching reference image */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              الأول
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Numeric Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                return (
                  p === 1 ||
                  p === totalPages ||
                  (p >= currentPage - 2 && p <= currentPage + 2)
                );
              })
              .map((p, idx, visiblePages) => {
                const prev = visiblePages[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <span className="px-1 text-slate-400 select-none">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg font-bold font-mono transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-[#006D77] text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              الأخير
            </button>
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      {selectedStudentToEdit && (
        <EditStudentModal
          isOpen={Boolean(selectedStudentToEdit)}
          student={selectedStudentToEdit}
          onClose={() => setSelectedStudentToEdit(null)}
          onUpdate={async (id, updates) => {
            if (onUpdateStudent) {
              await onUpdateStudent(id, updates);
            }
          }}
          onDelete={async (id, name) => {
            if (onDeleteStudent) {
              await onDeleteStudent(id, name);
            }
          }}
          isViewer={isViewer}
        />
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <ConfirmModal
          isOpen={Boolean(studentToDelete)}
          title="حذف سجل الطالب"
          message={`هل أنت متأكد من رغبتك في حذف بيانات الطالب "${studentToDelete.fullName}" (الرقم: ${studentToDelete.studentNumber}) من سجل المدرسة؟ لن يتمكن النظام من استرجاع هذا السجل بعد الحذف.`}
          confirmText="نعم، حذف السجل"
          cancelText="إلغاء"
          isDanger={true}
          onConfirm={async () => {
            if (studentToDelete && onDeleteStudent) {
              await onDeleteStudent(studentToDelete.id, studentToDelete.fullName);
              setStudentToDelete(null);
            }
          }}
          onCancel={() => setStudentToDelete(null)}
        />
      )}

      {/* Modal: Unique Tardiness Dates Breakdown for Selected Student */}
      {tardinessDatesPreviewStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] w-full max-w-lg rounded-2xl border-2 border-[#C9A227] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B2748] text-white px-5 py-4 flex items-center justify-between border-b border-[#C9A227]/40">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <h3 className="text-sm font-black">التواريخ المحتسبة في رصيد التأخير التراكمي</h3>
                  <p className="text-[11px] text-slate-300">
                    {tardinessDatesPreviewStudent.fullName} ({tardinessDatesPreviewStudent.studentNumber}) — {getGradeDisplayLabel(tardinessDatesPreviewStudent.grade)} / شعبة {tardinessDatesPreviewStudent.section}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTardinessDatesPreviewStudent(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {(() => {
                const uniqueDates = getUniqueStudentTardinessDates(tardinessDatesPreviewStudent, tardinessList);
                const fullRecords = getStudentTardinessRecordsList(tardinessDatesPreviewStudent, tardinessList);
                if (uniqueDates.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                      لا توجد أيام تأخير صباحي مسجلة لهذا الطالب خلال العام الدراسي الحالي.
                    </div>
                  );
                }
                return (
                  <>
                    <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                        إجمالي أيام التأخير الفعلية المحتسبة (بدون تكرار لليوم الواحد):
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-[#0B2748] text-[#C9A227] font-mono font-black text-sm">
                        {uniqueDates.length} أيام
                      </span>
                    </div>
                    <div className="space-y-2">
                      {uniqueDates.map((dateStr, idx) => {
                        const dayRec = fullRecords.find((r) => String(r.date).trim() === dateStr);
                        return (
                          <div
                            key={dateStr}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-[#0B2748] text-[#C9A227] font-mono font-black flex items-center justify-center text-[11px]">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-mono font-black text-slate-800 dark:text-slate-100 block">
                                  {dateStr}
                                </span>
                                {dayRec && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    وقت الوصول: {dayRec.arrivalTime || dayRec.time || 'غير محدد'} • الإجراء: {dayRec.actionTaken || dayRec.suggestedAction || 'تنبيه'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {dayRec?.recordedBy && (
                              <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                {dayRec.recordedBy}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const id = tardinessDatesPreviewStudent.id;
                  setTardinessDatesPreviewStudent(null);
                  onOpenProfile(id);
                }}
                className="px-4 py-2 rounded-xl bg-[#0B2748] text-[#C9A227] font-bold text-xs hover:bg-[#12395B] cursor-pointer"
              >
                فتح ملف الطالب الموحد الكامل
              </button>
              <button
                type="button"
                onClick={() => setTardinessDatesPreviewStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};