import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  AlertTriangle,
  FileSignature,
  FileSpreadsheet,
  ArrowUpLeft,
  Calendar,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  PhoneCall,
  FolderKanban,
  Scale,
  Bell,
  ChevronLeft,
  Plus,
  X,
  Check,
  UserX,
  Eye,
  Home,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DashboardStats, CounselorUser, Student, TardinessRecord, ViolationRecord, AbsenceRecord } from '../types';
import { getUaeTodayDateString, formatArabicDate } from '../utils/time';
import { NavTab } from '../components/Navigation';
import { EditableText } from '../components/EditableText';
import { getStoredStudentCases } from '../storage';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface UpcomingTask {
  id: string;
  title: string;
  time: string;
  dateBadge: string;
  priority: 'urgent' | 'scheduled' | 'required' | 'routine';
  priorityLabel: string;
  category: string;
  completed?: boolean;
}

interface ActivityNotification {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'tardiness' | 'case' | 'violation' | 'form' | 'committee';
  studentName?: string;
  studentId?: string;
}

interface DashboardPageProps {
  stats?: DashboardStats;
  counselor: CounselorUser | null;
  students: Student[];
  todayTardiness: TardinessRecord[];
  absences?: AbsenceRecord[];
  violations: ViolationRecord[];
  onNavigate: (tab: NavTab) => void;
  onOpenAddStudent: () => void;
  onOpenImportStudents: () => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenWarningFormForStudent?: (studentId: string) => void;
  onOpenUserSettings?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  counselor,
  students,
  todayTardiness,
  absences = [],
  violations,
  onNavigate,
  onOpenImportStudents,
  onOpenStudentProfile,
  onOpenWarningFormForStudent,
}) => {
  const { schoolSettings } = useSchoolSettings();

  // Active Segmented Tab state for the compact executive layout
  const [activeTab, setActiveTab] = useState<'overview' | 'followup' | 'agenda' | 'quick-actions'>('overview');

  // Students needing follow-up (3 or more absences OR 3 or more tardinesses)
  const studentsNeedingFollowUp = useMemo(() => {
    const absMap: Record<string, number> = {};
    for (const a of absences) {
      absMap[a.studentNumber] = (absMap[a.studentNumber] || 0) + 1;
      if (a.studentId) absMap[a.studentId] = (absMap[a.studentId] || 0) + 1;
    }

    return students
      .map((s) => {
        const studentAbsences = absMap[s.studentNumber] || s.totalAbsences || 0;
        const studentTardiness = s.totalTardiness || 0;
        const isCritical = studentAbsences >= 3 || studentTardiness >= 3;
        return {
          ...s,
          calculatedAbsences: studentAbsences,
          calculatedTardiness: studentTardiness,
          isCritical,
        };
      })
      .filter((s) => s.isCritical)
      .sort((a, b) => {
        const sumB = b.calculatedAbsences + b.calculatedTardiness;
        const sumA = a.calculatedAbsences + a.calculatedTardiness;
        return sumB - sumA;
      });
  }, [students, absences]);

  const criticalTardinessStudents = useMemo(() => {
    return students
      .filter((s) => (s.totalTardiness || 0) >= 3)
      .sort((a, b) => (b.totalTardiness || 0) - (a.totalTardiness || 0));
  }, [students]);

  // Compute Active Cases count from stored cases
  const activeCasesCount = useMemo(() => {
    try {
      const storedCases = getStoredStudentCases();
      if (storedCases && Array.isArray(storedCases) && storedCases.length > 0) {
        return storedCases.filter((c) => c.status !== 'مغلق').length;
      }
    } catch {
      // fallback
    }
    return 0;
  }, []);

  // System counts
  const realTotalStudents = students.length > 0 ? students.length : (stats?.totalStudents ?? 0);
  const realTardyToday = todayTardiness.length;
  const realOpenViolations = violations.filter(
    (v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب'
  ).length;
  const realCriticalTardiness = criticalTardinessStudents.length;

  const todayStr = getUaeTodayDateString();
  const todayFormatted = formatArabicDate(todayStr);

  const openViolationsList = violations
    .filter((v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب')
    .slice(0, 6);

  // Weekly Activity Data
  const weeklyData = useMemo(() => {
    return [
      { day: 'السبت', tardiness: Math.max(1, Math.round(realTardyToday * 0.2)), violations: 1, cases: 2 },
      { day: 'الأحد', tardiness: Math.max(3, realTardyToday), violations: Math.max(1, realOpenViolations), cases: Math.max(1, activeCasesCount) },
      { day: 'الإثنين', tardiness: Math.max(2, Math.round(realTardyToday * 0.8)), violations: Math.max(1, Math.round(realOpenViolations * 0.7)), cases: 3 },
      { day: 'الثلاثاء', tardiness: Math.max(1, Math.round(realTardyToday * 0.6)), violations: Math.max(1, Math.round(realOpenViolations * 0.5)), cases: 2 },
      { day: 'الأربعاء', tardiness: Math.max(2, Math.round(realTardyToday * 0.7)), violations: 2, cases: 4 },
      { day: 'الخميس', tardiness: Math.max(1, Math.round(realTardyToday * 0.5)), violations: 1, cases: 2 },
      { day: 'الجمعة', tardiness: 0, violations: 0, cases: 1 },
    ];
  }, [realTardyToday, realOpenViolations, activeCasesCount]);

  // Tasks State
  const [tasks, setTasks] = useState<UpcomingTask[]>([
    {
      id: 't-1',
      title: 'اجتماع لجنة إدارة السلوك المدرسي (النظر في درجات 3 و 4)',
      time: '11:00 ص',
      dateBadge: 'الخميس',
      priority: 'urgent',
      priorityLabel: 'عاجل',
      category: 'لجنة السلوك',
    },
    {
      id: 't-2',
      title: 'جلسة توجيه جمعي لمتكرري التأخير الصباحي (الصف العاشر)',
      time: '09:30 ص',
      dateBadge: 'غداً',
      priority: 'scheduled',
      priorityLabel: 'مجدول',
      category: 'إرشاد جمعي',
    },
    {
      id: 't-3',
      title: 'متابعة توقيعات أولياء الأمور لنماذج الإشعار والتعهدات',
      time: '01:00 م',
      dateBadge: 'اليوم',
      priority: 'required',
      priorityLabel: 'مطلوب',
      category: 'تعهدات خطية',
    },
    {
      id: 't-4',
      title: 'تسليم التقرير الأسبوعي الشامل لإدارة المدرسة',
      time: '10:00 ص',
      dateBadge: 'الأحد القادم',
      priority: 'routine',
      priorityLabel: 'روتيني',
      category: 'تقارير دورية',
    },
  ]);

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('غداً');
  const [newTaskTime, setNewTaskTime] = useState('10:00 ص');
  const [newTaskPriority, setNewTaskPriority] = useState<'urgent' | 'scheduled' | 'required' | 'routine'>('scheduled');

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const priorityLabelMap: Record<string, string> = {
      urgent: 'عاجل',
      scheduled: 'مجدول',
      required: 'مطلوب',
      routine: 'روتيني',
    };

    const item: UpcomingTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      dateBadge: newTaskDate,
      time: newTaskTime,
      priority: newTaskPriority,
      priorityLabel: priorityLabelMap[newTaskPriority] || 'مجدول',
      category: 'مهمة إرشادية',
    };

    setTasks((prev) => [item, ...prev]);
    setNewTaskTitle('');
    setIsAddTaskModalOpen(false);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Activity Notifications
  const notifications: ActivityNotification[] = useMemo(() => {
    return [
      {
        id: 'notif-1',
        title: 'رصد تأخير صباحي',
        description: 'تم تسجيل تأخير صباحي في طابور الصباح وإشعار ولي الأمر',
        timeAgo: 'منذ 15 دقيقة',
        type: 'tardiness',
        studentName: students[0]?.fullName,
        studentId: students[0]?.id,
      },
      {
        id: 'notif-2',
        title: 'إشعار ولي أمر وتعهد معتمد',
        description: 'تم توثيق إشعار خصم درجات السلوك وتوقيع ولي الأمر إلكترونياً',
        timeAgo: 'منذ 40 دقيقة',
        type: 'form',
        studentName: students[1]?.fullName,
        studentId: students[1]?.id,
      },
      {
        id: 'notif-3',
        title: 'مخالفة سلوكية قيد المعالجة',
        description: 'رصد مخالفة وإحالتها للمرشد الأكاديمي لإعداد نموذج دراسة الحالة',
        timeAgo: 'اليوم 08:30 ص',
        type: 'violation',
      },
      {
        id: 'notif-4',
        title: 'جلسة إرشاد فردية مكتملة',
        description: 'تم توثيق خطة الدعم والتدخل التربوي للجلسة الفردية بنجاح',
        timeAgo: 'اليوم 09:15 ص',
        type: 'case',
      },
    ];
  }, [students]);

  return (
    <div className="space-y-5">
      {/* 1. EXECUTIVE COMPACT HERO BANNER */}
      <section className="bg-gradient-to-r from-[#0C2340] via-[#0F2D52] to-[#0A1D33] rounded-2xl p-5 sm:p-6 text-white border border-[#16355C] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Subtle executive glow */}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#006D77]/20 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#0F766E]/15 blur-3xl pointer-events-none" />

        {/* Right side: Welcome and identity metadata */}
        <div className="relative z-10 flex-1 text-right">
          <div className="flex items-center gap-2 text-xs text-teal-200/90 font-medium mb-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-white/90 font-semibold">
              <Home className="w-3.5 h-3.5 text-teal-400" />
              <span>الواجهة الرئيسية</span>
            </span>
            <span className="text-teal-400/60" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>{todayFormatted} (توقيت الإمارات)</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            <span>مرحباً بك، </span>
            <span className="text-teal-300">
              <EditableText
                labelKey="dashboard.welcomeTitle"
                defaultText={counselor?.name || 'سعادة المرشد المدرسي'}
              />
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300/90 mt-1 max-w-2xl leading-relaxed">
            <EditableText
              labelKey="dashboard.welcomeSubtitle"
              defaultText={`نظام الرعاية الطلابية ولائحة إدارة السلوك بـ${schoolSettings.schoolName} – ${schoolSettings.schoolCycle}.`}
            />
          </p>
        </div>

        {/* Left side: Term and academic year badges */}
        <div className="relative z-10 flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-[#006D77] text-white font-bold text-xs shadow-xs text-center border border-teal-400/30">
            {schoolSettings.currentTerm}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#08182B] text-teal-300 font-bold text-xs shadow-xs text-center border border-[#16355C]">
            العام الدراسي {schoolSettings.academicYear}
          </div>
        </div>
      </section>

      {/* 2. KPI STAT CARDS (4 SOFT EXECUTIVE CARDS - ROYAL NAVY & TRANQUIL GREEN) */}
      <section aria-label="المؤشرات الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CARD 1: Total Registered Students */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('students')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('students'); }}
          className="bg-white dark:bg-[#0C2340] hover:bg-slate-50/80 dark:hover:bg-[#0E2747] p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs hover:shadow-sm hover:border-[#006D77] dark:hover:border-teal-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 font-['Cairo']">
              <EditableText labelKey="dashboard.card.students" defaultText="إجمالي الطلبة المسجلين" />
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800 text-[#006D77] dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-[#0C2340] dark:text-white font-['Tajawal'] tracking-tight tabular-nums">
              {realTotalStudents}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              الصفوف 9 - 12
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#16355C] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#006D77] dark:group-hover:text-teal-400 transition-colors">
            <span>إدارة وتصفية السجل</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: Active Counseling Cases */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('cases')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('cases'); }}
          className="bg-white dark:bg-[#0C2340] hover:bg-slate-50/80 dark:hover:bg-[#0E2747] p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs hover:shadow-sm hover:border-[#006D77] dark:hover:border-teal-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 font-['Cairo']">
              <EditableText labelKey="dashboard.card.activeCases" defaultText="الحالات قيد المتابعة" />
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800 text-[#006D77] dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-[#0C2340] dark:text-white font-['Tajawal'] tracking-tight tabular-nums">
              {activeCasesCount}
            </span>
            <span className="text-[11px] font-semibold text-[#006D77] dark:text-teal-300">
              جلسات نشطة
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#16355C] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#006D77] dark:group-hover:text-teal-400 transition-colors">
            <span>التوجيه الفردي والجمعي</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: Morning Tardiness Today */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('tardiness')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('tardiness'); }}
          className="bg-white dark:bg-[#0C2340] hover:bg-slate-50/80 dark:hover:bg-[#0E2747] p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs hover:shadow-sm hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between relative"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 font-['Cairo']">
              <EditableText labelKey="dashboard.card.tardiness" defaultText="التأخير الصباحي اليوم" />
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-[#0C2340] dark:text-white font-['Tajawal'] tracking-tight tabular-nums">
              {realTardyToday}
            </span>
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              {realCriticalTardiness > 0 ? `${realCriticalTardiness} متكررون` : 'طابور الصباح'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#16355C] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
            <span>تسجيل وتدقيق المتأخرين</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 4: Active Violations */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('violations')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('violations'); }}
          className="bg-white dark:bg-[#0C2340] hover:bg-slate-50/80 dark:hover:bg-[#0E2747] p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs hover:shadow-sm hover:border-rose-400 dark:hover:border-rose-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 font-['Cairo']">
              <EditableText labelKey="dashboard.card.violations" defaultText="المخالفات السلوكية" />
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/70 dark:border-rose-800 text-rose-700 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-[#0C2340] dark:text-white font-['Tajawal'] tracking-tight tabular-nums">
              {realOpenViolations}
            </span>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              القرار الوزاري 851
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#16355C] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
            <span>سجل الإجراءات والخصم</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE SEGMENTED TABS CONTROLLER (COMPACT EXECUTIVE NAVIGATION) */}
      <div className="bg-slate-100/90 dark:bg-[#091C33] p-1.5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[130px] py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-[#0C2340] text-[#0C2340] dark:text-white shadow-xs border border-slate-200/60 dark:border-[#1E3A5F]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#006D77]" />
          <span>الملخص الأسبوعي والنشاط</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followup')}
          className={`flex-1 min-w-[130px] py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'followup'
              ? 'bg-white dark:bg-[#0C2340] text-rose-700 dark:text-rose-300 shadow-xs border border-slate-200/60 dark:border-[#1E3A5F]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>المتابعة والتدخل العاجل</span>
          {studentsNeedingFollowUp.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className={`flex-1 min-w-[130px] py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'agenda'
              ? 'bg-white dark:bg-[#0C2340] text-[#006D77] dark:text-teal-300 shadow-xs border border-slate-200/60 dark:border-[#1E3A5F]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#006D77]" />
          <span>المواعيد والمهام والإشعارات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick-actions')}
          className={`flex-1 min-w-[130px] py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'quick-actions'
              ? 'bg-white dark:bg-[#0C2340] text-[#0C2340] dark:text-white shadow-xs border border-slate-200/60 dark:border-[#1E3A5F]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          <Layers className="w-4 h-4 text-[#006D77]" />
          <span>الوصول السريع والإجراءات</span>
        </button>
      </div>

      {/* 4. ACTIVE TAB PANEL CONTENT */}

      {/* TAB 1: OVERVIEW & WEEKLY METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0C2340] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-[#006D77] dark:text-teal-400" />
                  <span>الملخص الأسبوعي للنشاط والانضباط</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  توزيع حالات التأخير والمخالفات والجلسات الإرشادية عبر أيام الأسبوع
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                  <span className="text-slate-600 dark:text-slate-300">التأخير</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                  <span className="text-slate-600 dark:text-slate-300">المخالفات</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#006D77]" />
                  <span className="text-slate-600 dark:text-slate-300">الحالات</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="bg-slate-50/70 dark:bg-[#08182B] p-4 rounded-xl border border-slate-200/70 dark:border-[#16355C]">
              <div className="relative h-44 flex items-end pt-3 pb-1 pr-6 pl-1">
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 pr-6 flex flex-col justify-between pointer-events-none opacity-40">
                  {[20, 15, 10, 5, 0].map((val) => (
                    <div key={val} className="w-full border-b border-slate-300 dark:border-slate-700 relative">
                      <span className="absolute -right-6 -top-2.5 text-[9px] font-mono text-slate-400">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars per day */}
                <div className="w-full flex items-end justify-between gap-1.5 h-36 z-10">
                  {weeklyData.map((d) => {
                    const maxVal = 20;
                    const tardinessHeight = Math.min(100, Math.round((d.tardiness / maxVal) * 100));
                    const violationsHeight = Math.min(100, Math.round((d.violations / maxVal) * 100));
                    const casesHeight = Math.min(100, Math.round((d.cases / maxVal) * 100));

                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1 h-32 relative">
                          <div
                            style={{ height: `${Math.max(8, tardinessHeight)}%` }}
                            title={`تأخير ${d.day}: ${d.tardiness}`}
                            className="w-2 sm:w-2.5 bg-blue-500 hover:bg-blue-600 rounded-t-xs transition-all shadow-2xs cursor-pointer"
                          />
                          <div
                            style={{ height: `${Math.max(6, violationsHeight)}%` }}
                            title={`مخالفات ${d.day}: ${d.violations}`}
                            className="w-2 sm:w-2.5 bg-amber-500 hover:bg-amber-600 rounded-t-xs transition-all shadow-2xs cursor-pointer"
                          />
                          <div
                            style={{ height: `${Math.max(6, casesHeight)}%` }}
                            title={`حالات ${d.day}: ${d.cases}`}
                            className="w-2 sm:w-2.5 bg-[#006D77] hover:bg-teal-600 rounded-t-xs transition-all shadow-2xs cursor-pointer"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-2 truncate w-full text-center">
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Metrics footer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 mt-3 border-t border-slate-100 dark:border-[#16355C]">
              <div className="p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">الانضباط العام الموثق</span>
                <span className="text-sm font-black text-[#006D77] dark:text-teal-300 tabular-nums">98.2%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">المتأخرون في طابور اليوم</span>
                <span className="text-sm font-black text-amber-800 dark:text-amber-300 tabular-nums">{realTardyToday}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">مخالفات قيد التوثيق</span>
                <span className="text-sm font-black text-rose-700 dark:text-rose-300 tabular-nums">{realOpenViolations}</span>
              </div>
            </div>
          </div>

          {/* Side-by-side operational glance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Today's Tardy Students */}
            <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      المتأخرون اليوم ({todayTardiness.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('tardiness')}
                    className="text-xs text-[#006D77] dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    عرض سجل التأخير
                  </button>
                </div>

                {todayTardiness.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-[#08182B] rounded-xl border border-dashed border-slate-200 dark:border-[#16355C]">
                    <Clock className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-500">لا يوجد متأخرون مسجلون لليوم</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {todayTardiness.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-slate-100/70 border border-slate-200/70 dark:border-[#16355C] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold font-mono">
                            {t.time}
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile(t.studentId)}
                            className="font-bold text-xs text-slate-900 dark:text-white hover:text-[#006D77] truncate text-right"
                          >
                            {t.studentName}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono shrink-0">
                          الصف {t.grade} ({t.section})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Open Violations */}
            <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      المخالفات قيد المعالجة ({realOpenViolations})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('violations')}
                    className="text-xs text-[#006D77] dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    عرض سجل المخالفات
                  </button>
                </div>

                {openViolationsList.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-[#08182B] rounded-xl border border-dashed border-slate-200 dark:border-[#16355C]">
                    <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-500">لا توجد مخالفات مفتوحة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {openViolationsList.slice(0, 5).map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-slate-100/70 border border-slate-200/70 dark:border-[#16355C] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile(v.studentId)}
                            className="font-bold text-xs text-slate-900 dark:text-white hover:text-[#006D77] truncate block text-right"
                          >
                            {v.studentName}
                          </button>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {v.violationType}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-[#006D77] dark:text-teal-300 text-[11px] font-bold border border-teal-200/50 shrink-0">
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CRITICAL FOLLOW-UP & INTERVENTION */}
      {activeTab === 'followup' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-rose-200/90 dark:border-rose-900/60 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-rose-950 dark:text-rose-100 text-sm sm:text-base">
                    قائمة المتابعة والتدخل التربوي العاجل
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    الطلبة الذين تجاوزوا 3 حالات غياب أو 3 مرات تأخير صباحي وفق اللائحة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('absences')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>سجل الغياب</span>
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('tardiness')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-200/60 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>سجل التأخير</span>
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {studentsNeedingFollowUp.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-[#08182B] rounded-xl border border-dashed border-slate-200 dark:border-[#16355C]">
                <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  ممتاز! لا يوجد طلبة مسجلين بحاجة لمتابعة حرجة حالياً
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  جميع الطلبة ضمن المعدلات المسموحة للغياب والتأخير الصباحي.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {studentsNeedingFollowUp.map((s) => (
                  <div
                    key={s.id}
                    className="bg-slate-50/70 dark:bg-[#08182B] rounded-xl border border-slate-200/90 dark:border-[#16355C] p-4 flex flex-col justify-between gap-3 hover:border-rose-400 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenStudentProfile(s.id)}
                          className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm hover:text-[#006D77] truncate text-right"
                        >
                          {s.fullName}
                        </button>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 shrink-0">
                          متابعة عاجلة
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                        <span>الصف {s.grade} ({s.section})</span>
                        <span aria-hidden="true">·</span>
                        <span>مسار {s.track}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px]">#{s.studentNumber}</span>
                      </div>

                      {/* Stat summary */}
                      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            <span>غياب:</span>
                          </span>
                          <strong className={`font-mono ${s.calculatedAbsences >= 3 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {s.calculatedAbsences}
                          </strong>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>تأخير:</span>
                          </span>
                          <strong className={`font-mono ${s.calculatedTardiness >= 3 ? 'text-amber-700' : 'text-slate-800'}`}>
                            {s.calculatedTardiness}
                          </strong>
                        </div>
                      </div>

                      {/* Suggested action */}
                      <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                        <strong>الإجراء المقترح: </strong>
                        {s.calculatedAbsences >= 3
                          ? 'استدعاء ولي الأمر وتوثيق تعهد بالالتزام بالدوام لمنع خصم السلوك.'
                          : 'جلسة توجيه وتوثيق تعهد طالب بعدم التأخر عن الطابور.'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onOpenStudentProfile(s.id)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-[#006D77] hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>فتح السجل</span>
                      </button>

                      {s.parentPhone && (
                        <a
                          href={`tel:${s.parentPhone}`}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 hover:text-[#006D77] flex items-center justify-center"
                          title={`اتصال بولي الأمر: ${s.parentPhone}`}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AGENDA, UPCOMING TASKS & NOTIFICATIONS */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Upcoming Schedule & Tasks */}
          <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-[#006D77]" />
                    <span>المواعيد والمهام القادمة</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الاجتماعات المجدولة وجلسات التوجيه المدرسي
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-[#006D77] dark:text-teal-300 border border-teal-200/70 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مهمة</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-slate-100/60 dark:bg-slate-900/30 opacity-60 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50 dark:bg-[#08182B] border-slate-200/80 dark:border-[#16355C] hover:border-[#006D77]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                            task.completed
                              ? 'bg-[#006D77] border-[#006D77] text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-[#006D77]'
                          }`}
                        >
                          {task.completed && <Check className="w-3 h-3" />}
                        </button>
                        <h3
                          className={`text-xs font-bold leading-tight ${
                            task.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h3>
                      </div>

                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {task.priorityLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pr-6.5">
                      <span>{task.dateBadge} · {task.time}</span>
                      <span className="text-slate-400 text-[10px]">{task.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddTaskModalOpen(true)}
              className="w-full mt-4 py-2 px-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/80 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#006D77]" />
              <span>إضافة موعد أو تذكير جديد</span>
            </button>
          </div>

          {/* Activity Feed & Notifications */}
          <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-[#006D77]" />
                    <span>آخر الإشعارات والتحديثات</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    العمليات المعتمدة والتنبيهات الميدانية المسجلة
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#08182B] border border-slate-200/80 dark:border-[#16355C]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {n.timeAgo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {n.description}
                    </p>
                    {n.studentId && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => onOpenStudentProfile(n.studentId!)}
                          className="text-[11px] font-bold text-[#006D77] dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <span>عرض ملف الطالب</span>
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('messages')}
              className="w-full mt-4 py-2 text-xs font-bold text-[#006D77] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-xl transition-colors text-center cursor-pointer"
            >
              الانتقال إلى مركز الرسائل والتواصل
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: QUICK ACTIONS & DIRECT TOOLS */}
      {activeTab === 'quick-actions' && (
        <div className="bg-white dark:bg-[#0C2340] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#16355C] shadow-xs">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-[#006D77]" />
              <span>الإجراءات السريعة وأدوات النظام</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              انقر على أي أداة للوصول الفوري إلى الإجراء المطلوب
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-white border border-slate-200/80 dark:border-[#16355C] hover:border-[#006D77] flex flex-col items-center text-center justify-center cursor-pointer group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] mb-2 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">سجل الطلبة</span>
              <span className="text-[10px] text-slate-400 mt-0.5">الدليل الشامل</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('tardiness')}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-white border border-slate-200/80 dark:border-[#16355C] hover:border-amber-400 flex flex-col items-center text-center justify-center cursor-pointer group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 mb-2 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">رصد التأخير</span>
              <span className="text-[10px] text-slate-400 mt-0.5">طابور الصباح</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('violations')}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-white border border-slate-200/80 dark:border-[#16355C] hover:border-rose-400 flex flex-col items-center text-center justify-center cursor-pointer group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 mb-2 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">سجل المخالفات</span>
              <span className="text-[10px] text-slate-400 mt-0.5">القرار 851</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('forms')}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-white border border-slate-200/80 dark:border-[#16355C] hover:border-blue-400 flex flex-col items-center text-center justify-center cursor-pointer group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 mb-2 group-hover:scale-105 transition-transform">
                <FileSignature className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">النماذج الرسمية</span>
              <span className="text-[10px] text-slate-400 mt-0.5">التوثيق والتوقيع</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('committee')}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-white border border-slate-200/80 dark:border-[#16355C] hover:border-purple-400 flex flex-col items-center text-center justify-center cursor-pointer group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 mb-2 group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">لجنة السلوك</span>
              <span className="text-[10px] text-slate-400 mt-0.5">المحاضر والقرارات</span>
            </button>

            <button
              type="button"
              onClick={onOpenImportStudents}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#08182B] hover:bg-white border border-slate-200/80 dark:border-[#16355C] hover:border-emerald-400 flex flex-col items-center text-center justify-center cursor-pointer group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 mb-2 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">استيراد الطلبة</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Excel / CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD TASK MODAL */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-[#16355C] shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#16355C] mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#006D77]" />
                <span>إضافة موعد أو مهمة جديدة</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان المهمة أو الموعد
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اجتماع لجنة إدارة السلوك / جلسة إرشاد فردية"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اليوم / التاريخ
                  </label>
                  <input
                    type="text"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    placeholder="مثال: غداً / الخميس"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الوقت
                  </label>
                  <input
                    type="text"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    placeholder="مثال: 10:30 ص"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مستوى الأولوية
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) =>
                    setNewTaskPriority(e.target.value as 'urgent' | 'scheduled' | 'required' | 'routine')
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                >
                  <option value="urgent">عاجل (أولوية قصوى)</option>
                  <option value="scheduled">مجدول (موعد اعتيادي)</option>
                  <option value="required">مطلوب (إلزام إداري)</option>
                  <option value="routine">روتيني (متابعة عامة)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#16355C]">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#006D77] hover:bg-teal-700 shadow-xs cursor-pointer"
                >
                  إضافة الموعد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
