import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  Target,
  CalendarClock,
  CheckCircle2,
  Compass,
  Award,
  Clock,
  Plus,
  Send,
  UserPlus,
  FileText,
  MessageSquare,
  CheckSquare,
  Printer,
  ArrowUpLeft,
  Search,
  Filter,
  Check,
  X,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldAlert,
  Users,
  Briefcase,
  RefreshCw,
} from 'lucide-react';
import {
  Student,
  StudentCaseRecord,
  CounselingSessionRecord,
  GuidancePlanRecord,
  NeedsAssessmentRecord,
  CounselorTaskRecord,
  StudentReferralRecord,
  AppUser,
} from '../../types';
import {
  saveCounselorTaskFirestore,
  deleteCounselorTaskFirestore,
  saveStudentReferralFirestore,
} from '../../firebase/firestoreService';
import {
  setCounselorTasksLocal,
  setStudentReferralsLocal,
  getCounselingSessionsLocal,
} from '../../storage';
import { getUaeTodayDateString } from '../../utils/time';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface CounselorDashboardViewProps {
  students: Student[];
  cases: StudentCaseRecord[];
  plans: GuidancePlanRecord[];
  needsList: NeedsAssessmentRecord[];
  tasks: CounselorTaskRecord[];
  setTasks: React.Dispatch<React.SetStateAction<CounselorTaskRecord[]>>;
  referrals: StudentReferralRecord[];
  setReferrals: React.Dispatch<React.SetStateAction<StudentReferralRecord[]>>;
  currentUser: AppUser;
  selectedAcademicYear: string;
  onNavigateSubTab: (tab: 'dashboard' | 'plans_needs' | 'referrals' | 'cases_list' | 'individual_counseling' | 'tasks') => void;
  onOpenNewCaseModal: (prefillStudentId?: string, prefillReason?: string) => void;
  onOpenCaseDetails: (caseId: string) => void;
  onOpenStudentProfile?: (studentId: string) => void;
  onNavigateAppTab?: (tab: string) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onRefreshAll: () => Promise<void>;
  isSyncing: boolean;
  activeSubMode?: 'dashboard' | 'referrals' | 'tasks';
}

const REFERRAL_STATUS_MAP: Record<
  StudentReferralRecord['status'],
  { label: string; badgeClass: string }
> = {
  new: {
    label: 'جديدة',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
  },
  received: {
    label: 'مستلمة',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  studying: {
    label: 'قيد الدراسة',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
  },
  support_plan: {
    label: 'مرتبطة بخطة دعم',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300',
  },
  specialized_referral: {
    label: 'محالة لجهة متخصصة',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300',
  },
  closed: {
    label: 'مغلقة',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
};

export const CounselorDashboardView: React.FC<CounselorDashboardViewProps> = ({
  students,
  cases,
  plans,
  needsList,
  tasks,
  setTasks,
  referrals,
  setReferrals,
  currentUser,
  selectedAcademicYear,
  onNavigateSubTab,
  onOpenNewCaseModal,
  onOpenCaseDetails,
  onOpenStudentProfile,
  onNavigateAppTab,
  onShowToast,
  onRefreshAll,
  isSyncing,
  activeSubMode = 'dashboard',
}) => {
  const { schoolSettings } = useSchoolSettings();
  const schoolId = currentUser.schoolId || schoolSettings.schoolId || '7001';
  const counselorDefaultName = schoolSettings.counselorName || 'أمير علي عبدالشاكر بكري';
  const todayStr = getUaeTodayDateString();

  // Configurable SLA response settings (5 working days = 120h for normal, 48h for urgent)
  const [normalSlaDays, setNormalSlaDays] = useState<number>(5);
  const [urgentSlaHours, setUrgentSlaHours] = useState<number>(48);

  // Modals State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState<boolean>(false);
  const [editingReferral, setEditingReferral] = useState<StudentReferralRecord | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<CounselorTaskRecord | null>(null);
  const [isUncounseledModalOpen, setIsUncounseledModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Referral Filters
  const [refUrgencyFilter, setRefUrgencyFilter] = useState<string>('all');
  const [refStatusFilter, setRefStatusFilter] = useState<string>('all');
  const [refSearch, setRefSearch] = useState<string>('');

  // Referral Form State
  const [refStudentId, setRefStudentId] = useState<string>('');
  const [refSource, setRefSource] = useState<StudentReferralRecord['referralSource']>('معلم');
  const [refByName, setRefByName] = useState<string>('');
  const [refByRole, setRefByRole] = useState<string>('معلم مادة');
  const [refDate, setRefDate] = useState<string>(todayStr);
  const [refReason, setRefReason] = useState<string>('');
  const [refPriorActions, setRefPriorActions] = useState<string>('');
  const [refUrgency, setRefUrgency] = useState<'عادية' | 'عاجلة' | 'طارئة'>('عادية');
  const [refStatus, setRefStatus] = useState<StudentReferralRecord['status']>('new');
  const [refShareableRec, setRefShareableRec] = useState<string>('');
  const [refOutcome, setRefOutcome] = useState<string>('');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskType, setTaskType] = useState<CounselorTaskRecord['taskType']>('متابعة حالة');
  const [taskPriority, setTaskPriority] = useState<'عادية' | 'عاجلة' | 'طارئة'>('عادية');
  const [taskDueDate, setTaskDueDate] = useState<string>(todayStr);
  const [taskStudentId, setTaskStudentId] = useState<string>('');
  const [taskNotes, setTaskNotes] = useState<string>('');

  // Gather all executed counseling sessions across all cases
  const allSessions = useMemo(() => {
    const list: CounselingSessionRecord[] = [];
    cases.forEach((c) => {
      const caseSessions = getCounselingSessionsLocal(c.id);
      caseSessions.forEach((s) => {
        if (!s.isArchived) list.push(s);
      });
    });
    return list;
  }, [cases]);

  // Calculate 7 days from today for weekly follow-ups
  const nextWeekDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Calculate all 10 Counselor Dashboard Live Indicators
  const metrics = useMemo(() => {
    // 1. Referrals (new, urgent/emergency, overdue)
    const activeReferrals = referrals.filter((r) => r.status !== 'closed');
    const newReferralsCount = referrals.filter((r) => r.status === 'new').length;
    const urgentReferralsCount = activeReferrals.filter(
      (r) => r.urgency === 'عاجلة' || r.urgency === 'طارئة'
    ).length;

    const nowMs = Date.now();
    const overdueReferralsCount = activeReferrals.filter((r) => {
      const refMs = new Date(r.referralDate || r.createdAt).getTime();
      if (Number.isNaN(refMs)) return false;
      const elapsedHours = (nowMs - refMs) / (1000 * 60 * 60);
      const allowedHours = r.responseSlaHours || (r.urgency === 'عاجلة' ? urgentSlaHours : normalSlaDays * 24);
      return elapsedHours > allowedHours;
    }).length;

    // 2. Open Counseling Cases
    const openCasesCount = cases.filter((c) => !c.isArchived && c.status !== 'مغلق').length;

    // 3. Executed Sessions
    const executedSessionsCount = allSessions.length;

    // 4. Active Support Plans (cases with intervention plan + active academic/behavior plans)
    const activeSupportPlansCount =
      cases.filter((c) => !c.isArchived && c.status === 'توجد خطة تدخل').length +
      plans.filter((p) => p.status === 'in_progress' || p.status === 'approved').length;

    // 5. Follow-ups & Tasks due today and this week
    const caseFollowUpsToday = cases.filter(
      (c) => !c.isArchived && c.status !== 'مغلق' && c.nextFollowUpAt === todayStr
    ).length;
    const caseFollowUpsWeek = cases.filter(
      (c) =>
        !c.isArchived &&
        c.status !== 'مغلق' &&
        c.nextFollowUpAt &&
        c.nextFollowUpAt >= todayStr &&
        c.nextFollowUpAt <= nextWeekDateStr
    ).length;
    const pendingTasksToday = tasks.filter(
      (t) => t.status !== 'completed' && t.dueDate <= todayStr
    ).length;
    const pendingTasksWeek = tasks.filter(
      (t) => t.status !== 'completed' && t.dueDate >= todayStr && t.dueDate <= nextWeekDateStr
    ).length;

    // 6. Executed Guidance Programs / Activities
    const executedProgramsCount = plans.reduce(
      (acc, p) => acc + (Number(p.executedCount) || 0),
      0
    );

    // 7. Quarterly Plan Execution Percentage
    const quarterlyPlans = plans.filter((p) => p.planType === 'quarterly');
    const targetPlansForPct = quarterlyPlans.length > 0 ? quarterlyPlans : plans;
    const quarterlyExecutionPct =
      targetPlansForPct.length > 0
        ? Math.round(
            targetPlansForPct.reduce((acc, p) => acc + (Number(p.completionPercentage) || 0), 0) /
              targetPlansForPct.length
          )
        : 0;

    // 8. Students who haven't received Career Guidance sessions
    const studentIdsWithCareerGuidance = new Set<string>();
    cases.forEach((c) => {
      if (
        c.caseType === 'أكاديمية' ||
        c.subcategory?.includes('مهني') ||
        c.subcategory?.includes('مسار')
      ) {
        studentIdsWithCareerGuidance.add(c.studentId);
      }
    });
    allSessions.forEach((s) => {
      if (
        s.sessionType?.includes('مهني') ||
        s.sessionTopic?.includes('مهني') ||
        s.sessionTopic?.includes('مسار') ||
        s.studentId
      ) {
        if (s.studentId) studentIdsWithCareerGuidance.add(s.studentId);
      }
    });
    const studentsWithoutCareerGuidance = students.filter(
      (st) => !studentIdsWithCareerGuidance.has(st.id)
    );

    // 9. Supervisory Visit Required Evidences
    const totalEvidencesCount = plans.reduce(
      (acc, p) => acc + (Array.isArray(p.evidences) ? p.evidences.length : 0),
      0
    );

    return {
      newReferralsCount,
      urgentReferralsCount,
      overdueReferralsCount,
      totalReferrals: referrals.length,
      openCasesCount,
      executedSessionsCount,
      activeSupportPlansCount,
      dueTodayCount: caseFollowUpsToday + pendingTasksToday,
      dueWeekCount: caseFollowUpsWeek + pendingTasksWeek,
      executedProgramsCount,
      quarterlyExecutionPct,
      studentsWithoutCareerGuidance,
      totalEvidencesCount,
    };
  }, [
    referrals,
    cases,
    allSessions,
    plans,
    tasks,
    students,
    todayStr,
    nextWeekDateStr,
    normalSlaDays,
    urgentSlaHours,
  ]);

  // Recent Works Feed (آخر الأعمال المسجلة)
  const recentWorks = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      date: string;
      badge: string;
      badgeColor: string;
      onClick: () => void;
    }> = [];

    referrals.slice(0, 4).forEach((r) => {
      items.push({
        id: `ref-${r.id}`,
        title: `إحالة طلابية (${r.referralNumber}): ${r.studentName}`,
        subtitle: `جهة الإحالة: ${r.referralSource} (${r.referredByName}) – السبب: ${r.reason}`,
        date: r.referralDate || r.createdAt.split('T')[0],
        badge: `إحالة ${r.urgency}`,
        badgeColor:
          r.urgency === 'طارئة'
            ? 'bg-rose-100 text-rose-800 border-rose-300'
            : r.urgency === 'عاجلة'
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-blue-100 text-blue-800 border-blue-300',
        onClick: () => onNavigateSubTab('referrals'),
      });
    });

    cases.slice(0, 4).forEach((c) => {
      items.push({
        id: `case-${c.id}`,
        title: `ملف حالة (${c.caseNumber}): ${c.studentName}`,
        subtitle: `التصنيف: ${c.caseType} – الحالة: ${c.status}`,
        date: c.openedAt || c.createdAt.split('T')[0],
        badge: 'ملف حالة',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
        onClick: () => onOpenCaseDetails(c.id),
      });
    });

    plans.slice(0, 4).forEach((p) => {
      items.push({
        id: `plan-${p.id}`,
        title: `خطة إرشادية: ${p.title}`,
        subtitle: `المجال: ${p.domain} – نسبة الإنجاز: ${p.completionPercentage}%`,
        date: p.startDate || p.createdAt.split('T')[0],
        badge: 'خطة وبرنامج',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
        onClick: () => onNavigateSubTab('plans_needs'),
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [referrals, cases, plans, onNavigateSubTab, onOpenCaseDetails]);

  // Filtered Referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      if (refUrgencyFilter !== 'all' && r.urgency !== refUrgencyFilter) return false;
      if (refStatusFilter !== 'all' && r.status !== refStatusFilter) return false;
      if (refSearch.trim()) {
        const q = refSearch.toLowerCase();
        const match =
          r.studentName.toLowerCase().includes(q) ||
          r.studentNumber.toLowerCase().includes(q) ||
          r.referralNumber.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.referredByName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [referrals, refUrgencyFilter, refStatusFilter, refSearch]);

  // Open New Referral Modal
  const handleOpenNewReferral = (prefillStudentId?: string) => {
    setEditingReferral(null);
    setRefStudentId(prefillStudentId || students[0]?.id || '');
    setRefSource('معلم');
    setRefByName('');
    setRefByRole('معلم مادة');
    setRefDate(todayStr);
    setRefReason('');
    setRefPriorActions('التوجيه اللفظي الفردي داخل الحصة الدراسية والتنبيه الأولي');
    setRefUrgency('عادية');
    setRefStatus('new');
    setRefShareableRec('');
    setRefOutcome('');
    setIsReferralModalOpen(true);
  };

  const handleOpenEditReferral = (ref: StudentReferralRecord) => {
    setEditingReferral(ref);
    setRefStudentId(ref.studentId);
    setRefSource(ref.referralSource);
    setRefByName(ref.referredByName);
    setRefByRole(ref.referredByRole || 'معلم مادة');
    setRefDate(ref.referralDate);
    setRefReason(ref.reason);
    setRefPriorActions(ref.priorActions);
    setRefUrgency(ref.urgency);
    setRefStatus(ref.status);
    setRefShareableRec(ref.shareableRecommendations || '');
    setRefOutcome(ref.outcomeSummary || '');
    setIsReferralModalOpen(true);
  };

  // Save Referral to Firestore & LocalStorage
  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === refStudentId);
    if (!st && !editingReferral) {
      onShowToast('يرجى اختيار الطالب المحال من القائمة.', 'warning');
      return;
    }
    if (!refReason.trim()) {
      onShowToast('يرجى كتابة سبب الإحالة.', 'warning');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const slaHours =
      refUrgency === 'طارئة' ? 4 : refUrgency === 'عاجلة' ? urgentSlaHours : normalSlaDays * 24;

    const record: StudentReferralRecord = {
      id: editingReferral?.id || `REF-${Date.now()}`,
      referralNumber:
        editingReferral?.referralNumber ||
        `REF-${new Date().getFullYear()}-${String(referrals.length + 1).padStart(3, '0')}`,
      schoolId,
      academicYear:
        selectedAcademicYear === 'الكل'
          ? schoolSettings.academicYear || '2026–2027'
          : selectedAcademicYear,
      studentId: st?.id || editingReferral?.studentId || '',
      studentNumber: st?.studentNumber || editingReferral?.studentNumber || '',
      studentName: st?.name || editingReferral?.studentName || '',
      // Preserve historical grade and section at registration time!
      grade: editingReferral ? editingReferral.grade : st?.grade || 'العاشر',
      section: editingReferral ? editingReferral.section : st?.section || '1',
      referralSource: refSource,
      referredByName: refByName.trim() || 'معلم المادة',
      referredByRole: refByRole.trim(),
      referralDate: refDate,
      reason: refReason.trim(),
      priorActions: refPriorActions.trim(),
      urgency: refUrgency,
      responseSlaHours: slaHours,
      assignedCounselorName: counselorDefaultName,
      status: refStatus,
      shareableRecommendations: refShareableRec.trim(),
      outcomeSummary: refOutcome.trim(),
      createdAt: editingReferral?.createdAt || now,
      updatedAt: now,
    };

    try {
      const updated = await saveStudentReferralFirestore(schoolId, record, currentUser);
      setReferrals(updated);
      setStudentReferralsLocal(updated);
      setIsReferralModalOpen(false);
      onShowToast(
        editingReferral
          ? `تم تحديث الإحالة رقم (${record.referralNumber}) وحفظها في Firestore`
          : `تم تسجيل الإحالة رقم (${record.referralNumber}) للطالب ${record.studentName} في Firestore`,
        'success'
      );
    } catch {
      const exists = referrals.some((r) => r.id === record.id);
      const fallback = exists
        ? referrals.map((r) => (r.id === record.id ? record : r))
        : [record, ...referrals];
      setReferrals(fallback);
      setStudentReferralsLocal(fallback);
      setIsReferralModalOpen(false);
      onShowToast('تم حفظ الإحالة محلياً، وستتم المزامنة مع Firestore.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Task / Follow-up to Firestore
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      onShowToast('يرجى إدخال عنوان المهمة أو المتابعة.', 'warning');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const st = students.find((s) => s.id === taskStudentId);

    const record: CounselorTaskRecord = {
      id: editingTask?.id || `TASK-${Date.now()}`,
      schoolId,
      academicYear:
        selectedAcademicYear === 'الكل'
          ? schoolSettings.academicYear || '2026–2027'
          : selectedAcademicYear,
      title: taskTitle.trim(),
      taskType,
      priority: taskPriority,
      dueDate: taskDueDate,
      studentId: st?.id || editingTask?.studentId,
      studentName: st?.name || editingTask?.studentName,
      grade: st?.grade || editingTask?.grade,
      section: st?.section || editingTask?.section,
      status: editingTask?.status || 'pending',
      notes: taskNotes.trim(),
      createdBy: currentUser.fullName || counselorDefaultName,
      createdAt: editingTask?.createdAt || now,
      updatedAt: now,
    };

    try {
      const updated = await saveCounselorTaskFirestore(schoolId, record, currentUser);
      setTasks(updated);
      setCounselorTasksLocal(updated);
      setIsTaskModalOpen(false);
      onShowToast('تم حفظ المهمة والمتابعة في Firestore بنجاح.', 'success');
    } catch {
      const exists = tasks.some((t) => t.id === record.id);
      const fallback = exists
        ? tasks.map((t) => (t.id === record.id ? record : t))
        : [record, ...tasks];
      setTasks(fallback);
      setCounselorTasksLocal(fallback);
      setIsTaskModalOpen(false);
      onShowToast('تم حفظ المهمة محلياً.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTaskStatus = async (task: CounselorTaskRecord) => {
    const nextStatus: CounselorTaskRecord['status'] =
      task.status === 'completed' ? 'pending' : 'completed';
    const updatedTask: CounselorTaskRecord = {
      ...task,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    try {
      const updated = await saveCounselorTaskFirestore(schoolId, updatedTask, currentUser);
      setTasks(updated);
      setCounselorTasksLocal(updated);
      onShowToast(
        nextStatus === 'completed' ? 'تم توثيق إنجاز المهمة في Firestore' : 'تم إعادة فتح المهمة',
        'success'
      );
    } catch {
      const fallback = tasks.map((t) => (t.id === task.id ? updatedTask : t));
      setTasks(fallback);
      setCounselorTasksLocal(fallback);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const updated = await deleteCounselorTaskFirestore(schoolId, taskId);
      setTasks(updated);
      setCounselorTasksLocal(updated);
      onShowToast('تم حذف المهمة من السجل.', 'info');
    } catch {
      const fallback = tasks.filter((t) => t.id !== taskId);
      setTasks(fallback);
      setCounselorTasksLocal(fallback);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ===================================================================== */}
      {/* 1. COUNSELOR IDENTITY & QUICK ACTIONS BAR                             */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-l from-[#0C2340] via-[#0F2D52] to-[#006D77] rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-teal-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#D4AF37] text-slate-950 text-[11px] font-black">
                لوحة متابعة المرشد الأكاديمي والمهني
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-teal-200 text-[11px] font-bold border border-white/15">
                {schoolSettings.schoolName}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-[#D4AF37] text-[11px] font-bold border border-white/15">
                العام الدراسي: {selectedAcademicYear === 'الكل' ? schoolSettings.academicYear || '2026–2027' : selectedAcademicYear}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              المرشد الأكاديمي والمهني: {counselorDefaultName}
            </h2>
            <p className="text-xs text-slate-200/90">
              متابعة فورية للإحالات، الحالات الإرشادية، الجلسات الفردية والجماعية، الخطط الفصلية، التوجيه المهني، والشواهد الإشرافية.
            </p>
          </div>

          {/* Quick Actions Bar (إجراءات سريعة) */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => handleOpenNewReferral()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c29d2f] text-slate-950 text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              + إحالة جديدة
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubTab('individual_counseling')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              + جلسة إرشادية
            </button>

            <button
              type="button"
              onClick={() => onOpenNewCaseModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-300" />
              + فتح حالة
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubTab('plans_needs')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-amber-300" />
              + خطة / برنامج
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setTaskTitle('');
                setTaskType('متابعة حالة');
                setTaskPriority('عادية');
                setTaskDueDate(todayStr);
                setTaskStudentId('');
                setTaskNotes('');
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-300" />
              + مهمة متابعة
            </button>

            {onNavigateAppTab && (
              <button
                type="button"
                onClick={() => onNavigateAppTab('messages')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                تواصل أسري
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة التقرير
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. CLICKABLE 10 LIVE COUNSELOR KPI INDICATORS                         */}
      {/* ===================================================================== */}
      {activeSubMode === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* KPI 1: الإحالات الجديدة والعاجلة والمتأخرة */}
            <div
              onClick={() => onNavigateSubTab('referrals')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  الإحالات الطلابية
                </span>
                <Send className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {metrics.totalReferrals}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                  جديدة: {metrics.newReferralsCount}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                  عاجلة: {metrics.urgentReferralsCount}
                </span>
                {metrics.overdueReferralsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                    متأخرة: {metrics.overdueReferralsCount}
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: الحالات الإرشادية المفتوحة */}
            <div
              onClick={() => onNavigateSubTab('cases_list')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  الحالات الإرشادية المفتوحة
                </span>
                <FolderOpen className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-teal-700 dark:text-teal-300 font-mono">
                {metrics.openCasesCount}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>إجمالي الملفات: {cases.length}</span>
                <span className="text-teal-700 font-bold">فتح السجل ←</span>
              </div>
            </div>

            {/* KPI 3: الجلسات المنفذة */}
            <div
              onClick={() => onNavigateSubTab('individual_counseling')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  الجلسات الإرشادية المنفذة
                </span>
                <Sparkles className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                {metrics.executedSessionsCount}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>فردية وجماعية موثقة</span>
                <span className="text-indigo-700 font-bold">عرض الجلسات ←</span>
              </div>
            </div>

            {/* KPI 4: خطط الدعم النشطة */}
            <div
              onClick={() => onNavigateSubTab('plans_needs')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  خطط الدعم النشطة
                </span>
                <Target className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
                {metrics.activeSupportPlansCount}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>خطط تدخل ودعم أكاديمي</span>
                <span className="text-purple-700 font-bold">إدارة الخطط ←</span>
              </div>
            </div>

            {/* KPI 5: المتابعات المستحقة اليوم والأسبوع */}
            <div
              onClick={() => onNavigateSubTab('tasks')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  المتابعات المستحقة
                </span>
                <CalendarClock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                {metrics.dueTodayCount} <span className="text-xs font-bold">اليوم</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>خلال الأسبوع: {metrics.dueWeekCount}</span>
                <span className="text-amber-700 font-bold">المهام ←</span>
              </div>
            </div>

            {/* KPI 6: البرامج الإرشادية المنفذة */}
            <div
              onClick={() => onNavigateSubTab('plans_needs')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  البرامج والأنشطة المنفذة
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {metrics.executedProgramsCount}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>مرتبطة بأهداف الخطة</span>
                <span className="text-emerald-700 font-bold">التفاصيل ←</span>
              </div>
            </div>

            {/* KPI 7: نسبة تنفيذ الخطة الفصلية */}
            <div
              onClick={() => onNavigateSubTab('plans_needs')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  تنفيذ الخطة الفصلية
                </span>
                <LayoutDashboard className="w-4 h-4 text-[#006D77] group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-[#006D77] dark:text-teal-300 font-mono">
                {metrics.quarterlyExecutionPct}%
              </div>
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#006D77] h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, metrics.quarterlyExecutionPct)}%` }}
                />
              </div>
            </div>

            {/* KPI 8: الطلبة الذين لم يحصلوا على جلسات التوجيه المهني */}
            <div
              onClick={() => setIsUncounseledModalOpen(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#D4AF37] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  بانتظار التوجيه المهني
                </span>
                <Compass className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {metrics.studentsWithoutCareerGuidance.length}
              </div>
              <div className="mt-2 text-[10px] text-amber-700 font-bold flex items-center justify-between">
                <span>من أصل {students.length} طالب</span>
                <span>عرض القائمة ←</span>
              </div>
            </div>

            {/* KPI 9: الشواهد المطلوبة للزيارة الإشرافية */}
            <div
              onClick={() => onNavigateSubTab('plans_needs')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  شواهد الزيارة الإشرافية
                </span>
                <Award className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {metrics.totalEvidencesCount}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>ملفات وشواهد موثقة</span>
                <span className="text-emerald-700 font-bold">مكتبة الشواهد ←</span>
              </div>
            </div>

            {/* KPI 10: تحليل الاحتياجات والاستبانات */}
            <div
              onClick={() => onNavigateSubTab('plans_needs')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006D77] rounded-2xl p-4 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  الاحتياجات والاستبانات
                </span>
                <FileText className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
                {needsList.length}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                <span>مرتبطة بالخطة السنوية</span>
                <span className="text-blue-700 font-bold">فتح التحليل ←</span>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 3. SPLIT VIEW: DUE FOLLOW-UPS & RECENT LOGGED WORKS               */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: المتابعات والمهام المستحقة */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-[#006D77]" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      المتابعات والمهام المستحقة للمرشد
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setTaskTitle('');
                      setTaskDueDate(todayStr);
                      setIsTaskModalOpen(true);
                    }}
                    className="text-xs font-bold text-[#006D77] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة مهمة
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500">
                      لا توجد مهام متابعة مسجلة حالياً. يمكنك إضافة مهمة جديدة لحفظها في Firestore.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {tasks.slice(0, 6).map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          t.status === 'completed'
                            ? 'bg-slate-50/70 border-slate-200 opacity-75'
                            : t.dueDate < todayStr
                            ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(t)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                              t.status === 'completed'
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-[#006D77]'
                            }`}
                          >
                            {t.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate ${
                                t.status === 'completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {t.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-semibold text-[#006D77]">{t.taskType}</span>
                              <span>• الاستحقاق: {t.dueDate}</span>
                              {t.studentName && <span>• الطالب: {t.studentName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.priority === 'طارئة'
                                ? 'bg-rose-100 text-rose-800'
                                : t.priority === 'عاجلة'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="حذف المهمة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">
                  إجمالي المهام النشطة: {tasks.filter((t) => t.status !== 'completed').length}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSubTab('tasks')}
                  className="font-bold text-[#006D77] hover:underline cursor-pointer"
                >
                  فتح سجل المهام والمتابعات الكامل ←
                </button>
              </div>
            </div>

            {/* Right Column: آخر الأعمال المسجلة */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      آخر الأعمال المسجلة في المنظومة
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">تحديث تلقائي</span>
                </div>

                {recentWorks.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500">
                      لا توجد أعمال إرشادية مسجلة بعد. ابدأ بإنشاء خطة أو إحالة أو فتح ملف حالة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {recentWorks.map((item) => (
                      <div
                        key={item.id}
                        onClick={item.onClick}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#006D77] bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">
                  مرتبط بقاعدة بيانات Firestore مباشرة
                </span>
                <button
                  type="button"
                  onClick={onRefreshAll}
                  className="font-bold text-[#006D77] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  مزامنة السجلات
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* 4. STUDENT REFERRALS SYSTEM (نظام الإحالات الطلابية)                  */}
      {/* ===================================================================== */}
      {(activeSubMode === 'referrals' || activeSubMode === 'dashboard') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-[#006D77]" />
                نظام الإحالات الطلابية ومتابعة الاستجابة
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-teal-50 text-[#006D77] font-mono">
                  {filteredReferrals.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إحالات المعلمين والإدارة وسجل المخالفات والغياب مع ضبط مدد الاستجابة والتوصيات المهنية القابلة للمشاركة
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                <span className="font-bold text-slate-600 dark:text-slate-300">مدة الاستجابة:</span>
                <span>العادية ({normalSlaDays} أيام عمل)</span>
                <span>•</span>
                <span>العاجلة ({urgentSlaHours} ساعة)</span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenNewReferral()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-black shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                تسجيل إحالة طلابية جديدة
              </button>
            </div>
          </div>

          {/* Referral Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="بحث برقم الإحالة، اسم الطالب، المحيل، أو السبب..."
                className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <select
              value={refUrgencyFilter}
              onChange={(e) => setRefUrgencyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
            >
              <option value="all">جميع درجات الاستعجال</option>
              <option value="عادية">عادية (5 أيام عمل)</option>
              <option value="عاجلة">عاجلة (48 ساعة)</option>
              <option value="طارئة">طارئة (إجراءات حماية فورية)</option>
            </select>

            <select
              value={refStatusFilter}
              onChange={(e) => setRefStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
            >
              <option value="all">جميع حالات الإحالة</option>
              <option value="new">جديدة</option>
              <option value="received">مستلمة</option>
              <option value="studying">قيد الدراسة</option>
              <option value="support_plan">مرتبطة بخطة دعم</option>
              <option value="specialized_referral">محالة لجهة متخصصة</option>
              <option value="closed">مغلقة</option>
            </select>
          </div>

          {/* Referrals Table */}
          {filteredReferrals.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500">
                لا توجد إحالات مطابقة حالياً. اضغط على «تسجيل إحالة طلابية جديدة» لإضافة إحالة وحفظها في Firestore.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-black">رقم الإحالة</th>
                    <th className="p-3 font-black">الطالب (الصف/الشعبة)</th>
                    <th className="p-3 font-black">جهة الإحالة والمحيل</th>
                    <th className="p-3 font-black">التاريخ</th>
                    <th className="p-3 font-black">الاستعجال</th>
                    <th className="p-3 font-black">السبب والتوصيات المشاركة</th>
                    <th className="p-3 font-black">الحالة</th>
                    <th className="p-3 font-black text-center">إجراءات المرشد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredReferrals.map((ref) => {
                    const stBadge = REFERRAL_STATUS_MAP[ref.status] || REFERRAL_STATUS_MAP.new;
                    return (
                      <tr
                        key={ref.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-[#006D77]">
                          {ref.referralNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-black text-slate-900 dark:text-white">
                            {ref.studentName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            الصف: {ref.grade} / الشعبة: {ref.section} (محفوظ تاريخياً)
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ref.referralSource}
                          </span>
                          <div className="text-[10px] text-slate-500">{ref.referredByName}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{ref.referralDate}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              ref.urgency === 'طارئة'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : ref.urgency === 'عاجلة'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ref.urgency}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {ref.reason}
                          </p>
                          {ref.shareableRecommendations && (
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                              توصية للمعلم: {ref.shareableRecommendations}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stBadge.badgeClass}`}
                          >
                            {stBadge.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditReferral(ref)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                              title="دراسة الإحالة وتحديث الحالة والتوصيات"
                            >
                              تحديث
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenNewCaseModal(
                                  ref.studentId,
                                  `إحالة رقم (${ref.referralNumber}) من ${ref.referralSource}: ${ref.reason}`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-[11px] cursor-pointer"
                              title="تحويل الإحالة إلى ملف حالة إرشادية"
                            >
                              فتح حالة
                            </button>
                            {onOpenStudentProfile && ref.studentId && (
                              <button
                                type="button"
                                onClick={() => onOpenStudentProfile(ref.studentId)}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] cursor-pointer"
                                title="فتح الملف الإرشادي الموحد للطالب"
                              >
                                ملف الطالب
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
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. FULL TASKS & FOLLOW-UPS VIEW (when activeSubMode === 'tasks')       */}
      {/* ===================================================================== */}
      {activeSubMode === 'tasks' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#006D77]" />
                سجل المهام والمتابعات اليومية والأسبوعية للمرشد
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة جميع المتابعات المستحقة للحالات والإحالات والخطط والشواهد الإشرافية
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setTaskTitle('');
                setTaskDueDate(todayStr);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006D77] text-white text-xs font-black cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة مهمة أو متابعة جديدة
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-slate-500">
                لا توجد مهام مسجلة حالياً.
              </p>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(t)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${
                        t.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {t.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        النوع: {t.taskType} • تاريخ الاستحقاق: {t.dueDate}
                        {t.studentName ? ` • الطالب: ${t.studentName} (${t.grade})` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100">
                      {t.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CREATE / EDIT STUDENT REFERRAL                               */}
      {/* ===================================================================== */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="p-5 bg-[#0C2340] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-black">
                  {editingReferral
                    ? `تحديث ومتابعة الإحالة (${editingReferral.referralNumber})`
                    : 'إرسال / تسجيل إحالة طلابية جديدة للمرشد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReferral} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Emergency Child Protection Alert */}
              {refUrgency === 'طارئة' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-xs">
                      تنبيه رسمي للحالات الطارئة وحماية الطفل:
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      الحالات الطارئة تتطلب تطبيق إجراءات الحماية والتواصل الفوري المعتمد مع إدارة المدرسة والجهات المختصة، ولا يكفي تسجيل النموذج الإلكتروني وحده.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    الطالب المحال: *
                  </label>
                  <select
                    value={refStudentId}
                    onChange={(e) => setRefStudentId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="">-- اختر الطالب من السجل --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.grade} / {s.section}) - #{s.studentNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    جهة الإحالة: *
                  </label>
                  <select
                    value={refSource}
                    onChange={(e) => setRefSource(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="معلم">معلم مادة</option>
                    <option value="إدارة المدرسة">إدارة المدرسة</option>
                    <option value="سجل المخالفات">سجل المخالفات السلوكية</option>
                    <option value="سجل الغياب والتأخر">سجل الغياب والتأخر الصباحي</option>
                    <option value="ولي أمر">ولي أمر الطالب</option>
                    <option value="مبادرة ذاتية">مبادرة ذاتية من الطالب</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    اسم المحيل: *
                  </label>
                  <input
                    type="text"
                    required
                    value={refByName}
                    onChange={(e) => setRefByName(e.target.value)}
                    placeholder="اسم المعلم أو الإداري المحيل"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    تاريخ الإحالة:
                  </label>
                  <input
                    type="date"
                    value={refDate}
                    onChange={(e) => setRefDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    درجة الاستعجال:
                  </label>
                  <select
                    value={refUrgency}
                    onChange={(e) => setRefUrgency(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="عادية">عادية (استجابة خلال 5 أيام عمل)</option>
                    <option value="عاجلة">عاجلة (استجابة خلال 48 ساعة)</option>
                    <option value="طارئة">طارئة (تدخل وحماية فورية)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  سبب الإحالة ووصف الملاحظة: *
                </label>
                <textarea
                  rows={2}
                  required
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  placeholder="وصف دقيق للمشكلة الأكاديمية أو السلوكية أو الاجتماعية التي استدعت الإحالة..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  الإجراءات التربوية السابقة المتخذة قبل الإحالة:
                </label>
                <input
                  type="text"
                  value={refPriorActions}
                  onChange={(e) => setRefPriorActions(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    حالة الإحالة لدى المرشد:
                  </label>
                  <select
                    value={refStatus}
                    onChange={(e) => setRefStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="new">جديدة</option>
                    <option value="received">مستلمة</option>
                    <option value="studying">قيد الدراسة</option>
                    <option value="support_plan">مرتبطة بخطة دعم</option>
                    <option value="specialized_referral">محالة لجهة متخصصة</option>
                    <option value="closed">مغلقة</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    المرشد المسؤول:
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={counselorDefaultName}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 dark:bg-slate-800 font-bold text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-emerald-800 dark:text-emerald-400 block mb-1">
                  التوصيات المهنية المصرح بمشاركتها مع المعلم المحيل (دون كشف التفاصيل السرية):
                </label>
                <textarea
                  rows={2}
                  value={refShareableRec}
                  onChange={(e) => setRefShareableRec(e.target.value)}
                  placeholder="مثال: يوصى بتشجيع الطالب داخل الصف وتقسيم المهام الدراسية، مع متابعة التحسن أسبوعياً..."
                  className="w-full p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ملخص النتيجة والإجراء المتخذ:
                </label>
                <input
                  type="text"
                  value={refOutcome}
                  onChange={(e) => setRefOutcome(e.target.value)}
                  placeholder="تم عقد جلسة إرشادية فردية وربط الطالب بخطة دعم أكاديمي..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#006D77] text-white font-black shadow-md cursor-pointer"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ الإحالة في Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CREATE TASK / FOLLOW-UP                                      */}
      {/* ===================================================================== */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-[#0C2340] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-black">إضافة مهمة أو متابعة مستحقة للمرشد</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان المهمة / المتابعة: *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="مثال: متابعة خطة تحسين التحصيل الدراسي للطالب بعد أسبوعين"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع المهمة:</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="متابعة حالة">متابعة حالة</option>
                    <option value="متابعة إحالة">متابعة إحالة</option>
                    <option value="جلسة مجدولة">جلسة مجدولة</option>
                    <option value="تنفيذ خطة">تنفيذ خطة</option>
                    <option value="تواصل ولي أمر">تواصل ولي أمر</option>
                    <option value="شاهد زيارة إشرافية">شاهد زيارة إشرافية</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الأولوية:</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="عادية">عادية</option>
                    <option value="عاجلة">عاجلة</option>
                    <option value="طارئة">طارئة</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ الاستحقاق:</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ربط بطالب محدد (اختياري):</label>
                <select
                  value={taskStudentId}
                  onChange={(e) => setTaskStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                >
                  <option value="">-- مهمة عامة غير مرتبطة بطالب محدد --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.grade} / {s.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#006D77] text-white font-black cursor-pointer"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ المهمة في Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: STUDENTS WITHOUT CAREER GUIDANCE SESSIONS                    */}
      {/* ===================================================================== */}
      {isUncounseledModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-4 bg-[#0C2340] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black">
                  الطلبة الذين لم يحصلوا على جلسات التوجيه المهني ({metrics.studentsWithoutCareerGuidance.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUncounseledModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2 text-xs">
              {metrics.studentsWithoutCareerGuidance.slice(0, 50).map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-black text-slate-900 dark:text-white">{st.name}</span>
                    <span className="text-slate-500 mr-2">
                      الصف: {st.grade} / الشعبة: {st.section} ({st.track || 'عام'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUncounseledModalOpen(false);
                        onOpenNewCaseModal(
                          st.id,
                          'توجيه مهني وأكاديمي واستكشاف المسارات الجامعية والمهنية'
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#006D77] text-white font-bold cursor-pointer"
                    >
                      بدء جلسة توجيه مهني
                    </button>
                    {onOpenStudentProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUncounseledModalOpen(false);
                          onOpenStudentProfile(st.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                      >
                        ملف الطالب
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
