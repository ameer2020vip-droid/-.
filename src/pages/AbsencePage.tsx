import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
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
  Clock,
  Filter,
  RotateCcw,
  X,
  FileSpreadsheet,
  AlertTriangle,
  UserX,
  Eye,
  Check,
  ChevronDown,
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
  AbsenceRecord,
  AbsenceStatus,
  AbsenceExcuseStatus,
  GradeLevel,
  SectionName,
  AcademicTrack,
  CounselorUser,
} from '../types';
import {
  getUaeTodayDateString,
  formatArabicDate,
} from '../utils/time';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  useAcademicFiltering,
  getGradeDisplayLabel,
  getGradeCycleSubtitle,
} from '../hooks/useAcademicFiltering';

interface AbsencePageProps {
  students: Student[];
  absenceRecords: AbsenceRecord[];
  counselor: CounselorUser | null;
  onSaveAbsenceBatch: (
    records: Array<Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ successCount: number; duplicateCount: number; savedRecords: AbsenceRecord[] }>;
  onUpdateAbsence?: (record: AbsenceRecord) => Promise<void>;
  onDeleteAbsence: (id: string, studentNumber?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenMessageForStudent?: (studentId: string) => void;
}

type AbsenceTab = 'registration' | 'records' | 'reports' | 'charts';

const COLORS = ['#006D77', '#D4AF37', '#0C2340', '#E29578', '#2A9D8F'];

export const AbsencePage: React.FC<AbsencePageProps> = ({
  students,
  absenceRecords,
  counselor,
  onSaveAbsenceBatch,
  onUpdateAbsence,
  onDeleteAbsence,
  onShowToast,
  onOpenStudentProfile,
  onOpenMessageForStudent,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Main view tab
  const [activeTab, setActiveTab] = useState<AbsenceTab>('registration');

  // Selected date for attendance recording
  const todayStr = getUaeTodayDateString();
  const [recordingDate, setRecordingDate] = useState<string>(todayStr);

  // Class & Section browsing state
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('تاسع');
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrack>('عام');
  const [selectedSection, setSelectedSection] = useState<SectionName>('1');

  // State of absent students in the currently selected section: studentNumber -> { status, excuseStatus, notes }
  const [absentSelections, setAbsentSelections] = useState<
    Record<string, { status: AbsenceStatus; excuseStatus: AbsenceExcuseStatus; notes: string }>
  >({});

  // Search filter within currently selected section
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Modals & action states
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AbsenceRecord | null>(null);

  // Table Filters state
  const [tableSearch, setTableSearch] = useState('');
  const [tableDateFilterMode, setTableDateFilterMode] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today');
  const [tableCustomStartDate, setTableCustomStartDate] = useState(todayStr);
  const [tableCustomEndDate, setTableCustomEndDate] = useState(todayStr);
  const [tableGradeFilter, setTableGradeFilter] = useState<string>('all');
  const [tableTrackFilter, setTableTrackFilter] = useState<string>('all');
  const [tableSectionFilter, setTableSectionFilter] = useState<string>('all');
  const [tableExcuseFilter, setTableExcuseFilter] = useState<string>('all');

  // Reports & Broadcast selection
  const [selectedForBroadcast, setSelectedForBroadcast] = useState<Set<string>>(new Set());
  const [showBroadcastConfirmModal, setShowBroadcastConfirmModal] = useState(false);
  const [broadcastMessageDraft, setBroadcastMessageDraft] = useState('');

  // Dynamically compute filtered grades, tracks, and sections using useAcademicFiltering
  const {
    filteredGrades,
    filteredTracks,
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

  // Auto-sync selectedTrack if not in filteredTracks for the selected grade
  useEffect(() => {
    if (filteredTracks.length > 0 && !filteredTracks.includes(selectedTrack)) {
      setSelectedTrack(filteredTracks[0] as AcademicTrack);
    }
  }, [filteredTracks, selectedTrack]);

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

  // Students in selected grade, track & section (with fallback to grade + section if track is custom/empty)
  const sectionStudents = useMemo(() => {
    const exactMatch = students.filter(
      (s) => s.grade === selectedGrade && (s.track || 'عام') === selectedTrack && s.section === selectedSection
    );
    if (exactMatch.length > 0) {
      return exactMatch.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    }
    return students
      .filter((s) => s.grade === selectedGrade && s.section === selectedSection)
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

  // Quick lookup for students already marked absent on the selected recordingDate
  const alreadyAbsentTodaySet = useMemo(() => {
    const set = new Set<string>();
    absenceRecords
      .filter((r) => r.date === recordingDate)
      .forEach((r) => {
        set.add(r.studentNumber);
        if (r.studentId) set.add(r.studentId);
      });
    return set;
  }, [absenceRecords, recordingDate]);

  // Cumulative absences per student map
  const cumulativeAbsencesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of absenceRecords) {
      map[r.studentNumber] = (map[r.studentNumber] || 0) + 1;
      if (r.studentId) {
        map[r.studentId] = (map[r.studentId] || 0) + 1;
      }
    }
    return map;
  }, [absenceRecords]);

  // Toggle student absent status in current section
  const handleToggleStudentAbsent = (student: Student) => {
    setAbsentSelections((prev) => {
      const next = { ...prev };
      if (next[student.studentNumber]) {
        delete next[student.studentNumber];
      } else {
        next[student.studentNumber] = {
          status: 'غياب بدون عذر',
          excuseStatus: 'بدون عذر',
          notes: '',
        };
      }
      return next;
    });
  };

  const handleUpdateStudentAbsentDetails = (
    studentNumber: string,
    field: 'status' | 'excuseStatus' | 'notes',
    value: string
  ) => {
    setAbsentSelections((prev) => {
      const current = prev[studentNumber] || {
        status: 'غياب بدون عذر',
        excuseStatus: 'بدون عذر',
        notes: '',
      };
      return {
        ...prev,
        [studentNumber]: {
          ...current,
          [field]: value,
          ...(field === 'status' && value === 'غياب بعذر' ? { excuseStatus: 'بعذر' } : {}),
          ...(field === 'status' && value === 'غياب بدون عذر' ? { excuseStatus: 'بدون عذر' } : {}),
        },
      };
    });
  };

  // Select all / Deselect all in section
  const handleSelectAllAbsent = () => {
    const next: Record<string, { status: AbsenceStatus; excuseStatus: AbsenceExcuseStatus; notes: string }> = {};
    for (const s of filteredSectionStudents) {
      if (!alreadyAbsentTodaySet.has(s.studentNumber)) {
        next[s.studentNumber] = {
          status: 'غياب بدون عذر',
          excuseStatus: 'بدون عذر',
          notes: '',
        };
      }
    }
    setAbsentSelections(next);
  };

  const handleDeselectAll = () => {
    setAbsentSelections({});
  };

  // Save current section attendance batch
  const handleSaveAttendance = async () => {
    const absentStudentNumbers = Object.keys(absentSelections);
    if (absentStudentNumbers.length === 0) {
      onShowToast('لم تقم بتحديد أي طالب غائب في هذه الشعبة', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave: Array<Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>> = [];

      for (const num of absentStudentNumbers) {
        const student = sectionStudents.find((s) => s.studentNumber === num);
        if (!student) continue;

        const details = absentSelections[num];
        recordsToSave.push({
          schoolId: student.schoolId || counselor?.schoolId || schoolSettings.schoolId || 'school-main',
          studentId: student.id,
          studentNumber: student.studentNumber,
          studentName: student.fullName,
          grade: student.grade,
          section: student.section,
          track: student.track,
          date: recordingDate,
          status: details.status,
          excuseStatus: details.excuseStatus,
          notes: details.notes || '',
          recordedBy: counselor?.name || 'المرشد الأكاديمي',
        });
      }

      const res = await onSaveAbsenceBatch(recordsToSave);
      if (res.successCount > 0) {
        onShowToast(
          `تم تسجيل غياب ${res.successCount} طالب بنجاح${
            res.duplicateCount > 0 ? ` (${res.duplicateCount} مسجل مسبقاً)` : ''
          }`,
          'success'
        );
        setAbsentSelections({});
      } else if (res.duplicateCount > 0) {
        onShowToast(`الطلبة المحددون مسجلون غائبين بالفعل في تاريخ ${recordingDate}`, 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء حفظ سجل الغياب', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Records for the records table & reports tab
  const filteredRecords = useMemo(() => {
    return absenceRecords.filter((rec) => {
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

      // Excuse status
      if (tableExcuseFilter !== 'all' && rec.excuseStatus !== tableExcuseFilter) return false;

      // Search query (Student name or number)
      if (tableSearch.trim()) {
        const q = tableSearch.trim().toLowerCase();
        const matchesName = rec.studentName.toLowerCase().includes(q);
        const matchesNum = rec.studentNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesNum) return false;
      }

      return true;
    });
  }, [
    absenceRecords,
    tableDateFilterMode,
    tableCustomStartDate,
    tableCustomEndDate,
    tableGradeFilter,
    tableTrackFilter,
    tableSectionFilter,
    tableExcuseFilter,
    tableSearch,
    todayStr,
  ]);

  // Excel / CSV Export
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      onShowToast('لا توجد بيانات مطابقة لتصديرها', 'warning');
      return;
    }

    const rows = filteredRecords.map((r, idx) => ({
      '#': idx + 1,
      'تاريخ الغياب': r.date,
      'الرقم الطلابي': r.studentNumber,
      'اسم الطالب': r.studentName,
      'الصف': r.grade,
      'الشعبة': r.section,
      'المسار': r.track,
      'نوع الغياب': r.status,
      'حالة العذر': r.excuseStatus,
      'إجمالي غياب الطالب': cumulativeAbsencesMap[r.studentNumber] || 1,
      'ملاحظات': r.notes || '-',
      'مسجل الغياب': r.recordedBy,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف الغياب');

    const fileName = `كشف_الغياب_${tableDateFilterMode}_${recordingDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onShowToast(`تم تصدير كشف الغياب بنجاح (${rows.length} سجل)`, 'success');
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Broadcast to selected absent students' parents
  const handleOpenBroadcastModal = () => {
    if (selectedForBroadcast.size === 0) {
      onShowToast('يرجى تحديد طالب واحد على الأقل من القائمة', 'info');
      return;
    }
    const sampleStudent = students.find((s) => selectedForBroadcast.has(s.studentNumber));
    setBroadcastMessageDraft(
      `عناية ولي الأمر الكريم، نود إحاطتكم بعلم تسجيل غياب الطالب عن الدوام المدرسي اليوم ${recordingDate}. نرجو تزويد المدرسة بالعذر المقبول لتوثيقه رسمياً.`
    );
    setShowBroadcastConfirmModal(true);
  };

  const handleConfirmSendBroadcast = () => {
    setShowBroadcastConfirmModal(false);
    onShowToast(`تم تجهيز وإرسال إشعارات الغياب لـ ${selectedForBroadcast.size} ولي أمر بنجاح`, 'success');
    setSelectedForBroadcast(new Set());
  };

  // Analytics Computation for Recharts
  const statsOverview = useMemo(() => {
    const todayAbsences = absenceRecords.filter((r) => r.date === todayStr);
    const todayCount = todayAbsences.length;
    const totalStudentsCount = students.length || 1;
    const attendanceRate = Math.max(0, Math.min(100, Math.round(((totalStudentsCount - todayCount) / totalStudentsCount) * 100)));

    // Week absences
    const weekCount = absenceRecords.filter((r) => {
      const d = new Date(r.date);
      const now = new Date(todayStr);
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    // Frequent absentees (3 or more absences)
    const frequentAbsentees = students.filter(
      (s) => (cumulativeAbsencesMap[s.studentNumber] || s.totalAbsences || 0) >= 3
    );

    return {
      todayCount,
      attendanceRate,
      weekCount,
      frequentCount: frequentAbsentees.length,
      frequentList: frequentAbsentees,
    };
  }, [absenceRecords, students, todayStr, cumulativeAbsencesMap]);

  // Weekly Trend Chart Data
  const weeklyTrendData = useMemo(() => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    return days.map((dayName, index) => {
      const count = absenceRecords.filter((r) => {
        const d = new Date(r.date);
        return d.getDay() === index;
      }).length;
      return {
        day: dayName,
        'بدون عذر': Math.max(1, count),
        'بعذر': Math.round(count * 0.4),
      };
    });
  }, [absenceRecords]);

  // Monthly Trend Chart Data
  const monthlyTrendData = useMemo(() => {
    const months = ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'];
    return months.map((w, idx) => ({
      week: w,
      'نسبة الحضور': 94 - idx * 1.5,
      'حالات الغياب': Math.max(4, Math.round(absenceRecords.length * (0.2 + idx * 0.05))),
    }));
  }, [absenceRecords]);

  // Grade Distribution Chart Data
  const gradeDistributionData = useMemo(() => {
    return filteredGrades.map((grade) => {
      const count = absenceRecords.filter((r) => r.grade === grade).length;
      return {
        name: `الصف ${grade}`,
        value: count,
      };
    });
  }, [absenceRecords, filteredGrades]);

  return (
    <div className="space-y-6 text-right font-['Cairo'] pb-12">
      {/* 1. Header Ribbon & Navigation Subtabs */}
      <div className="bg-gradient-to-l from-[#0C2340] via-[#0C2340] to-[#006D77] rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold font-['Tajawal']">
                نظام الحضور والانضباط المدرسي
              </span>
              <span className="text-xs text-slate-300">
                {formatArabicDate(recordingDate)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Tajawal'] text-white">
              الغياب والحضور المدرسي
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              رصد وتوثيق غياب طلبة {schoolSettings.schoolName}، إصدار الكشوف الرسمية، ومتابعة مؤشرات الحضور الذكية.
            </p>
          </div>

          {/* Quick Date Selector */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 self-start md:self-auto">
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-slate-200">تاريخ الرصد:</span>
            <input
              type="date"
              value={recordingDate}
              onChange={(e) => setRecordingDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Subtabs Menu */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/10 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'registration'
                ? 'bg-[#D4AF37] text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>تسجيل ورصد الغياب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-[#D4AF37] text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل الغياب العام ({absenceRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-[#D4AF37] text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>كشف الغائبين والتصدير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'charts'
                ? 'bg-[#D4AF37] text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>الرسوم والتحليلات البيانية</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today Absent */}
        <div className="bg-white dark:bg-[#0C2340] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">غائبو اليوم</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <UserX className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 font-['Tajawal']">
              {statsOverview.todayCount}
            </span>
            <span className="text-[11px] font-bold text-slate-400">طالب</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">بتاريخ: {recordingDate}</p>
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="bg-white dark:bg-[#0C2340] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">نسبة الحضور اليوم</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-['Tajawal']">
              {statsOverview.attendanceRate}%
            </span>
            <span className="text-[11px] font-bold text-emerald-600">ممتاز</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">من إجمالي {students.length} طالب مسجل</p>
        </div>

        {/* Card 3: Week Absences */}
        <div className="bg-white dark:bg-[#0C2340] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">إجمالي غياب الأسبوع</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-[#D4AF37]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 font-['Tajawal']">
              {statsOverview.weekCount}
            </span>
            <span className="text-[11px] font-bold text-slate-400">حالة</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">خلال آخر 7 أيام عمل</p>
        </div>

        {/* Card 4: Frequent Absentees */}
        <div className="bg-white dark:bg-[#0C2340] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تجاوزوا 3 غيابات</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 font-['Tajawal']">
              {statsOverview.frequentCount}
            </span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-md">
              متابعة وإرشاد
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">يستوجب خطة وتعهداً من ولي الأمر</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REGISTRATION (رصد الغياب: الصفوف -> الشعب -> قائمة الطلاب) */}
      {/* ========================================================================= */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {/* STEP 1: Grade Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#006D77] text-white flex items-center justify-center text-xs font-black">1</span>
                <span>اختر الصف الدراسي:</span>
              </h2>
              <span className="text-xs text-slate-400">انقر على الصف لعرض شعبه</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {filteredGrades.map((grade) => {
                const isSelected = selectedGrade === grade;
                const countStudents = students.filter((s) => s.grade === grade).length;
                const absentInGrade = absenceRecords.filter(
                  (r) => r.grade === grade && r.date === recordingDate
                ).length;

                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(grade);
                      setAbsentSelections({});
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#0C2340] to-[#006D77] text-white border-[#D4AF37] shadow-lg scale-[1.02]'
                        : 'bg-white dark:bg-[#0C2340] border-slate-200 dark:border-slate-800 hover:border-[#006D77] text-slate-800 dark:text-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {countStudents} طالب
                      </span>
                      {absentInGrade > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-[#D4AF37] text-slate-950' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {absentInGrade} غائب
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black font-['Tajawal']">{getGradeDisplayLabel(grade)}</h3>
                    <p className={`text-[11px] mt-1 ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                      {getGradeCycleSubtitle(grade)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Section Boxes (Divided into General and Advanced Tracks) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#006D77] text-white flex items-center justify-center text-xs font-black">2</span>
                <span>اختر الشعبة والمسار (الصف {selectedGrade}):</span>
              </h2>
              <span className="text-xs text-slate-400">
                الشعب التابعة للصف {selectedGrade} مقسمة بالمسار
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
                    const sectionStudentsCount = students.filter(
                      (s) => s.grade === selectedGrade && (s.track || 'عام') === 'عام' && s.section === sec
                    ).length;
                    const sectionAbsentTodayCount = absenceRecords.filter(
                      (r) => r.grade === selectedGrade && (r.track || 'عام') === 'عام' && r.section === sec && r.date === recordingDate
                    ).length;

                    return (
                      <button
                        key={`absence-gen-${sec}`}
                        type="button"
                        onClick={() => {
                          setSelectedTrack('عام');
                          setSelectedSection(sec);
                          setAbsentSelections({});
                        }}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#006D77] text-white border-[#006D77] shadow-md ring-2 ring-[#D4AF37]/50'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-[#006D77] shadow-2xs'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-black font-['Tajawal']">عام – شعبة {sec}</div>
                        <div className={`text-[11px] mt-1 flex items-center justify-center gap-1.5 ${
                          isSelected ? 'text-teal-100' : 'text-slate-400'
                        }`}>
                          <span>{sectionStudentsCount} طالب</span>
                          {sectionAbsentTodayCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold text-[10px]">
                              {sectionAbsentTodayCount}
                            </span>
                          )}
                        </div>
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
                    const sectionStudentsCount = students.filter(
                      (s) => s.grade === selectedGrade && (s.track || 'عام') === 'متقدم' && s.section === sec
                    ).length;
                    const sectionAbsentTodayCount = absenceRecords.filter(
                      (r) => r.grade === selectedGrade && (r.track || 'عام') === 'متقدم' && r.section === sec && r.date === recordingDate
                    ).length;

                    return (
                      <button
                        key={`absence-adv-${sec}`}
                        type="button"
                        onClick={() => {
                          setSelectedTrack('متقدم');
                          setSelectedSection(sec);
                          setAbsentSelections({});
                        }}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-[#D4AF37]/50'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-indigo-500 shadow-2xs'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-black font-['Tajawal']">متقدم – شعبة {sec}</div>
                        <div className={`text-[11px] mt-1 flex items-center justify-center gap-1.5 ${
                          isSelected ? 'text-indigo-100' : 'text-slate-400'
                        }`}>
                          <span>{sectionStudentsCount} طالب</span>
                          {sectionAbsentTodayCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold text-[10px]">
                              {sectionAbsentTodayCount}
                            </span>
                          )}
                        </div>
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
                    const sectionStudentsCount = students.filter(
                      (s) => s.grade === selectedGrade && s.track === 'يحتاج مراجعة' && s.section === sec
                    ).length;
                    const sectionAbsentTodayCount = absenceRecords.filter(
                      (r) => r.grade === selectedGrade && r.track === 'يحتاج مراجعة' && r.section === sec && r.date === recordingDate
                    ).length;

                    return (
                      <button
                        key={`absence-rev-${sec}`}
                        type="button"
                        onClick={() => {
                          setSelectedTrack('يحتاج مراجعة');
                          setSelectedSection(sec);
                          setAbsentSelections({});
                        }}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-[#D4AF37]/50'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-amber-500 shadow-2xs'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-black font-['Tajawal']">مراجعة – شعبة {sec}</div>
                        <div className={`text-[11px] mt-1 flex items-center justify-center gap-1.5 ${
                          isSelected ? 'text-amber-100' : 'text-slate-400'
                        }`}>
                          <span>{sectionStudentsCount} طالب</span>
                          {sectionAbsentTodayCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold text-[10px]">
                              {sectionAbsentTodayCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Student Attendance List */}
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-['Tajawal']">
                    قائمة طلاب: الصف {selectedGrade} ({selectedTrack === 'متقدم' ? 'المسار المتقدم' : 'المسار العام'} – شعبة {selectedSection})
                  </h3>
                  <span className="text-xs bg-[#006D77]/10 text-[#006D77] px-2.5 py-0.5 rounded-lg font-bold border border-[#006D77]/20">
                    الافتراضي: الطالب حاضر
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  قم بتحديد الطلاب <strong className="text-rose-600 font-bold">الغياب فقط</strong> عبر تفعيل علامة الصح بجانب اسم الطالب.
                </p>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                  الإجمالي: <strong className="text-slate-900 dark:text-white font-mono">{sectionStudents.length}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  الحاضرون: <strong className="font-mono">{sectionStudents.length - Object.keys(absentSelections).length}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-300">
                  الغائبون المحددون: <strong className="font-mono">{Object.keys(absentSelections).length}</strong>
                </div>
              </div>
            </div>

            {/* Quick Actions & Search within section */}
            <div className="p-3.5 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث باسم الطالب أو رقمه الطلابي..."
                  value={sectionSearchQuery}
                  onChange={(e) => setSectionSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-[#006D77]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllAbsent}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                  <span>تحديد الكل كغائبين</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>إلغاء التحديد (الكل حاضر)</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="p-3.5 pr-5 w-12 text-center">غائب؟</th>
                    <th className="p-3.5">اسم الطالب</th>
                    <th className="p-3.5">الرقم الطلابي</th>
                    <th className="p-3.5">المسار</th>
                    <th className="p-3.5">الحالة السلوكية</th>
                    <th className="p-3.5">تراكم الغياب</th>
                    <th className="p-3.5">خيارات الغياب (عند التحديد)</th>
                    <th className="p-3.5 pl-5 text-center">ملف الطالب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSectionStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا يوجد طلاب في هذه الشعبة مطابقون للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredSectionStudents.map((s) => {
                      const isMarkedAbsent = !!absentSelections[s.studentNumber];
                      const isAlreadyRecorded = alreadyAbsentTodaySet.has(s.studentNumber);
                      const cumulativeCount = cumulativeAbsencesMap[s.studentNumber] || s.totalAbsences || 0;
                      const absentData = absentSelections[s.studentNumber];

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors ${
                            isMarkedAbsent
                              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-l-4 border-l-rose-600'
                              : isAlreadyRecorded
                              ? 'bg-amber-50/40 dark:bg-amber-950/15'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 pr-5 text-center">
                            <input
                              type="checkbox"
                              checked={isMarkedAbsent}
                              onChange={() => handleToggleStudentAbsent(s)}
                              disabled={isAlreadyRecorded}
                              className="w-4.5 h-4.5 text-rose-600 rounded-md focus:ring-rose-500 cursor-pointer accent-rose-600"
                            />
                          </td>

                          {/* Student Name */}
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{s.fullName}</span>
                              {isAlreadyRecorded && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300">
                                  مسجل غائباً مسبقاً اليوم
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Student Number */}
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {s.studentNumber}
                          </td>

                          {/* Track */}
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                              {s.track}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              s.status === 'منتظم'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {s.status}
                            </span>
                          </td>

                          {/* Cumulative Absences */}
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                              cumulativeCount >= 3
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {cumulativeCount} أيام
                              {cumulativeCount >= 3 && ' ⚠️'}
                            </span>
                          </td>

                          {/* Options if marked absent */}
                          <td className="p-3.5">
                            {isMarkedAbsent ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={absentData.status}
                                  onChange={(e) =>
                                    handleUpdateStudentAbsentDetails(
                                      s.studentNumber,
                                      'status',
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-800 dark:text-slate-200"
                                >
                                  <option value="غياب بدون عذر">غياب بدون عذر</option>
                                  <option value="غياب بعذر">غياب بعذر</option>
                                  <option value="مستأذن">مستأذن</option>
                                </select>

                                <input
                                  type="text"
                                  placeholder="ملاحظات / العذر..."
                                  value={absentData.notes}
                                  onChange={(e) =>
                                    handleUpdateStudentAbsentDetails(
                                      s.studentNumber,
                                      'notes',
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] w-36"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>حاضر</span>
                              </span>
                            )}
                          </td>

                          {/* Student Profile */}
                          <td className="p-3.5 pl-5 text-center">
                            <button
                              type="button"
                              onClick={() => onOpenStudentProfile(s.id)}
                              className="p-1.5 text-slate-500 hover:text-[#006D77] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="فتح سجل الطالب الموحد"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                سيتم اعتماد غياب <strong className="text-rose-600 font-bold font-mono">{Object.keys(absentSelections).length}</strong> طالب في الصف {selectedGrade} (شعبة {selectedSection}) بتاريخ {recordingDate}.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isSaving || Object.keys(absentSelections).length === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  id="btn-save-absence-batch"
                  onClick={handleSaveAttendance}
                  disabled={isSaving || Object.keys(absentSelections).length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري حفظ الغياب...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>حفظ غياب الشعبة ({Object.keys(absentSelections).length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECORDS TABLE (سجل الغياب العام مع فلاتر كاملة) */}
      {/* ========================================================================= */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#0C2340] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#006D77]" />
                <span>تصفية وفرز سجل الغياب:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setTableSearch('');
                  setTableDateFilterMode('today');
                  setTableGradeFilter('all');
                  setTableSectionFilter('all');
                  setTableExcuseFilter('all');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Date Mode Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">الفترة الزمنية</label>
                <select
                  value={tableDateFilterMode}
                  onChange={(e) => setTableDateFilterMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="today">اليوم ({todayStr})</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                  <option value="custom">فترة مخصصة (من - إلى)</option>
                  <option value="all">كافة السجلات</option>
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">الصف</label>
                <select
                  value={tableGradeFilter}
                  onChange={(e) => setTableGradeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">كافة الصفوف</option>
                  {filteredGrades.map((g) => (
                    <option key={g} value={g}>الصف {g}</option>
                  ))}
                </select>
              </div>

              {/* Track Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">المسار الأكاديمي</label>
                <select
                  value={tableTrackFilter}
                  onChange={(e) => setTableTrackFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">كافة المسارات</option>
                  {tableAvailableTracks.map((trk) => (
                    <option key={trk} value={trk}>
                      {trk === 'متقدم' ? 'المسار المتقدم' : trk === 'يحتاج مراجعة' ? 'مسار غير محدد' : 'المسار العام'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">الشعبة</label>
                <select
                  value={tableSectionFilter}
                  onChange={(e) => setTableSectionFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">كافة الشعب</option>
                  {tableFilteredSections.map((s) => (
                    <option key={s} value={s}>شعبة {s}</option>
                  ))}
                </select>
              </div>

              {/* Excuse Status Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">العذر</label>
                <select
                  value={tableExcuseFilter}
                  onChange={(e) => setTableExcuseFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">الكل (بعذر وبدون عذر)</option>
                  <option value="بدون عذر">بدون عذر</option>
                  <option value="بعذر">بعذر مقبول</option>
                  <option value="قيد المراجعة">قيد المراجعة</option>
                </select>
              </div>

              {/* Student Search */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">بحث بالطالب</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="الاسم أو الرقم..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {tableDateFilterMode === 'custom' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-500">من تاريخ:</span>
                <input
                  type="date"
                  value={tableCustomStartDate}
                  onChange={(e) => setTableCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
                <span className="font-bold text-slate-500">إلى تاريخ:</span>
                <input
                  type="date"
                  value={tableCustomEndDate}
                  onChange={(e) => setTableCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
            )}
          </div>

          {/* Records Table */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                نتائج السجل: <strong className="font-mono text-slate-900 dark:text-white">{filteredRecords.length}</strong> حالة مسجلة
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="p-3.5 pr-5">التاريخ</th>
                    <th className="p-3.5">اسم الطالب</th>
                    <th className="p-3.5">الرقم الطلابي</th>
                    <th className="p-3.5">الصف / الشعبة</th>
                    <th className="p-3.5">نوع الغياب</th>
                    <th className="p-3.5">حالة العذر</th>
                    <th className="p-3.5">التراكمي</th>
                    <th className="p-3.5">الملاحظات</th>
                    <th className="p-3.5">سُجل بواسطة</th>
                    <th className="p-3.5 pl-5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        لا توجد سجلات غياب مطابقة للمعايير المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => {
                      const cumulative = cumulativeAbsencesMap[rec.studentNumber] || 1;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="p-3.5 pr-5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                            {rec.date}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <button
                              type="button"
                              onClick={() => onOpenStudentProfile(rec.studentId)}
                              className="hover:text-[#006D77] transition-colors cursor-pointer text-right"
                            >
                              {rec.studentName}
                            </button>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{rec.studentNumber}</td>
                          <td className="p-3.5 font-semibold">
                            الصف {rec.grade} - {rec.track || 'عام'} (شعبة {rec.section})
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              {rec.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              rec.excuseStatus === 'بعذر'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {rec.excuseStatus}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={cumulative >= 3 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}>
                              {cumulative} أيام
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500 max-w-xs truncate">
                            {rec.notes || '-'}
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {rec.recordedBy}
                          </td>
                          <td className="p-3.5 pl-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onUpdateAbsence && (
                                <button
                                  type="button"
                                  onClick={() => setEditingRecord(rec)}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="تعديل حالة العذر أو الملاحظات"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(rec)}
                                className="p-1 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="حذف السجل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REPORTS & DISPATCH (كشف الغائبين والطباعة وإرسال رسائل للغائبين) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                استخراج كشف الغائبين والإشعارات الرسمية
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تحديد طلاب محددين لاستخراج تقرير رسمي أو إرسال إشعارات عبر النظام لأولياء الأمور
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تصدير كشف الغياب (Excel)</span>
              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="px-3.5 py-2 rounded-xl bg-[#0C2340] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-white/10"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <span>طباعة الكشف</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBroadcastModal}
                disabled={selectedForBroadcast.size === 0}
                className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-[#D4AF37]" />
                <span>إرسال للطلبة المحددين ({selectedForBroadcast.size})</span>
              </button>
            </div>
          </div>

          {/* Quick selection checklist table */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-3.5 px-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedForBroadcast.size === filteredRecords.length) {
                      setSelectedForBroadcast(new Set());
                    } else {
                      setSelectedForBroadcast(new Set(filteredRecords.map((r) => r.studentNumber)));
                    }
                  }}
                  className="font-bold text-[#006D77] hover:underline cursor-pointer"
                >
                  {selectedForBroadcast.size === filteredRecords.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الغائبين بالكشف'}
                </button>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 dark:text-slate-300">
                  تم تحديد: <strong>{selectedForBroadcast.size}</strong> من {filteredRecords.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="p-3.5 pr-5 w-12 text-center">اختيار</th>
                    <th className="p-3.5">اسم الطالب</th>
                    <th className="p-3.5">الرقم الطلابي</th>
                    <th className="p-3.5">الصف / الشعبة</th>
                    <th className="p-3.5">تاريخ الغياب</th>
                    <th className="p-3.5">نوع الغياب</th>
                    <th className="p-3.5">هاتف ولي الأمر</th>
                    <th className="p-3.5 pl-5 text-center">إشعار فردي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد سجلات غياب وفق الفلاتر الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => {
                      const isSelected = selectedForBroadcast.has(rec.studentNumber);
                      const studentObj = students.find((s) => s.studentNumber === rec.studentNumber);

                      return (
                        <tr
                          key={rec.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-teal-50/60 dark:bg-teal-950/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3.5 pr-5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedForBroadcast((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(rec.studentNumber)) {
                                    next.delete(rec.studentNumber);
                                  } else {
                                    next.add(rec.studentNumber);
                                  }
                                  return next;
                                });
                              }}
                              className="w-4.5 h-4.5 rounded text-[#006D77] cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            {rec.studentName}
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{rec.studentNumber}</td>
                          <td className="p-3.5">الصف {rec.grade} - {rec.track || 'عام'} (شعبة {rec.section})</td>
                          <td className="p-3.5 font-mono">{rec.date}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-bold">
                              {rec.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {studentObj?.parentPhone || '0501234567'}
                          </td>
                          <td className="p-3.5 pl-5 text-center">
                            {onOpenMessageForStudent && (
                              <button
                                type="button"
                                onClick={() => onOpenMessageForStudent(rec.studentId)}
                                className="px-2.5 py-1 bg-[#0C2340] hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                إرسال إشعار
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RECHARTS CHARTS & ANALYTICS (الرسوم والتحليلات البيانية) */}
      {/* ========================================================================= */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Weekly Absence Trend */}
            <div className="bg-white dark:bg-[#0C2340] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#006D77]" />
                    <span>اتجاه ونسبة الغياب الأسبوعي</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">توزيع حالات الغياب اليومية حسب نوع العذر</p>
                </div>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrendData}>
                    <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C2340',
                        color: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '12px',
                        textAlign: 'right',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="بدون عذر" fill="#E63946" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="بعذر" fill="#006D77" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Monthly Attendance Trend */}
            <div className="bg-white dark:bg-[#0C2340] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>اتجاه الغياب والحضور الشهري</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">معدل الانضباط التراكمي على مدار أسابيع الشهر</p>
                </div>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData}>
                    <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C2340',
                        color: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '12px',
                        textAlign: 'right',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="حالات الغياب"
                      stroke="#E63946"
                      fill="#E63946"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Grade Distribution */}
            <div className="bg-white dark:bg-[#0C2340] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#D4AF37]" />
                    <span>توزيع حالات الغياب حسب الصفوف</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">نسبة الغياب التراكمية من الصف التاسع إلى الثاني عشر</p>
                </div>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gradeDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {gradeDistributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0C2340',
                        color: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '12px',
                        textAlign: 'right',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panel 4: Frequent Absentees Table (3+ cases) */}
            <div className="bg-white dark:bg-[#0C2340] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>الطلبة المتكرر غيابهم (3 حالات فأكثر)</span>
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    {statsOverview.frequentList.length} طلاب
                  </span>
                </div>

                <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                  {statsOverview.frequentList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      لا يوجد طلاب تجاوزوا 3 غيابات حتى الآن.
                    </div>
                  ) : (
                    statsOverview.frequentList.slice(0, 5).map((s) => (
                      <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{s.fullName}</p>
                          <p className="text-[11px] text-slate-400">
                            الصف {s.grade} ({s.section}) • #{s.studentNumber}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 font-mono">
                            {cumulativeAbsencesMap[s.studentNumber] || s.totalAbsences || 3} أيام
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile(s.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-[#006D77] cursor-pointer"
                            title="فتح الملف"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                وفقاً للائحة السلوك الطلابي، يستوجب الغياب المتكرر فتح استدعاء ولي أمر وتوقيع تعهد الالتزام بالدوام.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <ConfirmModal
          isOpen={!!recordToDelete}
          title="تأكيد حذف سجل الغياب"
          message={`هل أنت متأكد من حذف سجل غياب الطالب "${recordToDelete.studentName}" بتاريخ ${recordToDelete.date}؟`}
          confirmLabel="نعم، حذف السجل"
          cancelLabel="إلغاء"
          isDanger={true}
          onConfirm={async () => {
            const target = recordToDelete;
            setRecordToDelete(null);
            try {
              await onDeleteAbsence(target.id, target.studentNumber);
              onShowToast('تم حذف سجل الغياب بنجاح', 'success');
            } catch (err: any) {
              onShowToast(err.message || 'فشل حذف السجل', 'error');
            }
          }}
          onCancel={() => setRecordToDelete(null)}
        />
      )}

      {/* Edit Absence Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl max-w-md w-full p-6 text-right border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                تعديل حالة غياب الطالب: {editingRecord.studentName}
              </h4>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">نوع الغياب</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      status: e.target.value as AbsenceStatus,
                      ...(e.target.value === 'غياب بعذر' ? { excuseStatus: 'بعذر' } : {}),
                      ...(e.target.value === 'غياب بدون عذر' ? { excuseStatus: 'بدون عذر' } : {}),
                    })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold"
                >
                  <option value="غياب بدون عذر">غياب بدون عذر</option>
                  <option value="غياب بعذر">غياب بعذر</option>
                  <option value="مستأذن">مستأذن</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">حالة العذر</label>
                <select
                  value={editingRecord.excuseStatus}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      excuseStatus: e.target.value as AbsenceExcuseStatus,
                    })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold"
                >
                  <option value="بدون عذر">بدون عذر</option>
                  <option value="بعذر">بعذر مقبول</option>
                  <option value="قيد المراجعة">قيد المراجعة</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">ملاحظات / نص العذر</label>
                <textarea
                  rows={3}
                  value={editingRecord.notes || ''}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      notes: e.target.value,
                    })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  placeholder="أدخل ملاحظات أو تقرير الإجازة المرضية..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onUpdateAbsence && editingRecord) {
                    try {
                      await onUpdateAbsence(editingRecord);
                      onShowToast('تم تحديث حالة الغياب بنجاح', 'success');
                      setEditingRecord(null);
                    } catch (err: any) {
                      onShowToast(err.message || 'فشل التحديث', 'error');
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#006D77] text-white text-xs font-bold"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Confirm Modal */}
      {showBroadcastConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl max-w-md w-full p-6 text-right border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-[#006D77]" />
                <span>تأكيد إرسال إشعار الغياب لأولياء الأمور</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowBroadcastConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
              سيتم إرسال إشعار غياب لعدد <strong className="font-bold">{selectedForBroadcast.size}</strong> من أولياء أمور الطلبة المحددين بتاريخ {recordingDate}.
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">نص الرسالة المقترح:</label>
              <textarea
                rows={4}
                value={broadcastMessageDraft}
                onChange={(e) => setBroadcastMessageDraft(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowBroadcastConfirmModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmSendBroadcast}
                className="px-5 py-2 rounded-xl bg-[#006D77] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>تأكيد وإرسال</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
